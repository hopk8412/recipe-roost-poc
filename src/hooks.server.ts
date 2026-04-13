import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { redis } from '$lib/server/redis';
import { logger } from '$lib/server/logger';
import { checkRateLimit } from '$lib/server/rate-limit';
import { httpRequestsTotal, httpRequestDurationSeconds } from '$lib/server/metrics';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { userRoles } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------
// Applied to auth mutation endpoints to guard against brute-force attacks.
// Limits are per IP address; Redis sliding window (60 s window).

const RATE_LIMITED_PATHS = ['/login', '/register'];
const RATE_LIMIT_OPTS = { limit: 10, windowMs: 60_000 };

const handleRateLimit: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isAuthPost =
		event.request.method === 'POST' && RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p));

	if (isAuthPost) {
		const ip =
			event.request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
			event.getClientAddress();
		const key = `${ip}:${pathname}`;
		const result = await checkRateLimit(key, RATE_LIMIT_OPTS);

		if (!result.allowed) {
			return new Response(JSON.stringify({ error: 'Too many requests' }), {
				status: 429,
				headers: {
					'Content-Type': 'application/json',
					'Retry-After': String(result.retryAfter ?? 60)
				}
			});
		}
	}

	return resolve(event);
};

// ---------------------------------------------------------------------------
// Session resolution with Redis cache
// ---------------------------------------------------------------------------
// On every request we need to know who is logged in.  Calling
// auth.api.getSession() hits the database each time.  We short-circuit that by
// caching the serialised session in Redis for 5 minutes (TTL is refreshed on
// every hit so active users never feel a cold cache).

const SESSION_COOKIE = 'better-auth.session_token';
const SESSION_TTL_S = 300; // 5 minutes

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);

	if (token) {
		const cacheKey = `session:${token}`;
		try {
			const cached = await redis.get(cacheKey);
			if (cached) {
				const parsed = JSON.parse(cached) as { user: App.Locals['user']; session: App.Locals['session'] };
				event.locals.user = parsed.user ?? undefined;
				event.locals.session = parsed.session ?? undefined;
				// Refresh TTL so active sessions stay warm
				await redis.expire(cacheKey, SESSION_TTL_S);
				return svelteKitHandler({ event, resolve, auth, building });
			}
		} catch (err) {
			logger.error({ err }, 'Redis session cache read error');
		}
	}

	// Cache miss — resolve via better-auth (DB lookup)
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;

		// Write-through cache: store serialised session for future requests
		if (token) {
			const cacheKey = `session:${token}`;
			try {
				await redis.setex(cacheKey, SESSION_TTL_S, JSON.stringify(session));
			} catch (err) {
				logger.error({ err }, 'Redis session cache write error');
			}
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

// ---------------------------------------------------------------------------
// Role resolution
// ---------------------------------------------------------------------------
// Runs after session resolution. Queries user_roles for the authenticated user
// and sets event.locals.isAdmin so downstream code can skip a DB round-trip.

const handleRoles: Handle = async ({ event, resolve }) => {
	if (event.locals.user) {
		const rows = await db
			.select({ role: userRoles.role })
			.from(userRoles)
			.where(eq(userRoles.userId, event.locals.user.id));
		event.locals.isAdmin = rows.some((r) => r.role === 'admin');
	} else {
		event.locals.isAdmin = false;
	}
	return resolve(event);
};

// ---------------------------------------------------------------------------
// HTTP security headers
// ---------------------------------------------------------------------------

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const start = Date.now();
	const response = await resolve(event);
	const duration = Date.now() - start;

	const route = event.route.id ?? event.url.pathname;
	const labels = { method: event.request.method, route, status: String(response.status) };

	httpRequestsTotal.inc(labels);
	httpRequestDurationSeconds.observe(labels, duration / 1000);

	logger.info(
		{
			method: event.request.method,
			path: event.url.pathname,
			status: response.status,
			durationMs: duration
		},
		'request'
	);

	// X-Frame-Options — prevent clickjacking
	response.headers.set('X-Frame-Options', 'DENY');

	// X-Content-Type-Options — prevent MIME sniffing
	response.headers.set('X-Content-Type-Options', 'nosniff');

	// Referrer-Policy — only send origin on cross-origin requests
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	// Permissions-Policy — disable sensitive browser APIs
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	// Content-Security-Policy
	// img-src includes the MinIO public URL so recipe images load correctly.
	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-inline for Svelte, unsafe-eval for adapter-node runtime
		"style-src 'self' 'unsafe-inline'", // unsafe-inline needed for Tailwind/Svelte styles
		"img-src 'self' data: blob: http://localhost:9000 https:",
		"font-src 'self'",
		"connect-src 'self'",
		"frame-ancestors 'none'"
	].join('; ');
	response.headers.set('Content-Security-Policy', csp);

	return response;
};

// ---------------------------------------------------------------------------
// Export composed handle
// ---------------------------------------------------------------------------

export const handle: Handle = sequence(handleRateLimit, handleBetterAuth, handleRoles, handleSecurityHeaders);
