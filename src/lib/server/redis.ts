import Redis from 'ioredis';
import { env } from '$env/dynamic/private';
import { logger } from './logger';

if (!env.REDIS_URL) throw new Error('REDIS_URL is not set');

// Singleton Redis client — shared across all server-side requests.
// ioredis automatically reconnects on connection loss.
export const redis = new Redis(env.REDIS_URL, {
	lazyConnect: true,
	maxRetriesPerRequest: 2,
	enableReadyCheck: false
});

redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));
redis.on('connect', () => logger.info('Redis connected'));
