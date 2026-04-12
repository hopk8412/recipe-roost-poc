import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { redis } from '$lib/server/redis';
import { sql } from 'drizzle-orm';

/**
 * GET /api/ready — readiness probe.
 *
 * Checks every critical dependency before reporting ready. Use this for
 * Kubernetes readiness checks — traffic is only routed to the pod once all
 * checks pass, and the pod is removed from rotation if they start failing.
 *
 * Returns 200 { status: "ready", checks: { db: "ok", redis: "ok" } } on success.
 * Returns 503 with failing check details if any dependency is unavailable.
 */
export const GET: RequestHandler = async () => {
	const checks: Record<string, 'ok' | string> = {};

	// ── PostgreSQL ──────────────────────────────────────────────────────────
	try {
		await db.execute(sql`SELECT 1`);
		checks.db = 'ok';
	} catch (err) {
		checks.db = err instanceof Error ? err.message : 'unreachable';
	}

	// ── Redis ───────────────────────────────────────────────────────────────
	try {
		await redis.ping();
		checks.redis = 'ok';
	} catch (err) {
		checks.redis = err instanceof Error ? err.message : 'unreachable';
	}

	const allOk = Object.values(checks).every((v) => v === 'ok');

	return Response.json(
		{ status: allOk ? 'ready' : 'degraded', checks },
		{ status: allOk ? 200 : 503 }
	);
};
