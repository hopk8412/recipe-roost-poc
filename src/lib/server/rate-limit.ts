import { redis } from './redis';
import { logger } from './logger';

export interface RateLimitOptions {
	/** Maximum number of requests allowed within the window. */
	limit: number;
	/** Sliding window duration in milliseconds. */
	windowMs: number;
}

/**
 * Sliding-window rate limiter backed by Redis sorted sets.
 *
 * Each unique key gets a sorted set where members are request timestamps.
 * Old entries outside the current window are pruned on every check, so the
 * counter always reflects only the live window.
 *
 * Returns `{ allowed: true }` when the request is within the limit, or
 * `{ allowed: false, retryAfter }` (seconds until the oldest entry expires)
 * when the limit is exceeded.
 */
export async function checkRateLimit(
	key: string,
	opts: RateLimitOptions
): Promise<{ allowed: boolean; retryAfter?: number }> {
	const now = Date.now();
	const windowStart = now - opts.windowMs;
	const redisKey = `rate_limit:${key}`;

	try {
		const pipeline = redis.pipeline();
		// Remove entries older than the window
		pipeline.zremrangebyscore(redisKey, 0, windowStart);
		// Add the current request
		pipeline.zadd(redisKey, now, String(now));
		// Count requests in the window
		pipeline.zcard(redisKey);
		// Expire the key slightly after the window so Redis cleans it up
		pipeline.pexpire(redisKey, opts.windowMs + 1000);

		const results = await pipeline.exec();
		// results[2] is the ZCARD response: [error, count]
		const count = (results?.[2]?.[1] as number) ?? 0;

		if (count > opts.limit) {
			// Oldest entry in the window tells us when a slot frees up
			const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
			const oldestTs = oldest[1] ? parseInt(oldest[1], 10) : now;
			const retryAfter = Math.ceil((oldestTs + opts.windowMs - now) / 1000);
			logger.warn({ key, count, limit: opts.limit }, 'Rate limit exceeded');
			return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
		}

		return { allowed: true };
	} catch (err) {
		// Fail open: if Redis is unavailable, allow the request but log the error
		logger.error({ err, key }, 'Rate limiter Redis error — failing open');
		return { allowed: true };
	}
}
