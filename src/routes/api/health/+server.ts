import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { redis } from '$lib/server/redis';
import { sql } from 'drizzle-orm';

/**
 * GET /api/health — liveness probe.
 *
 * Returns 200 as long as the process is running, without checking dependencies.
 * Use this for Kubernetes/Docker liveness checks so a failed dependency does not
 * cause unnecessary pod restarts.
 */
export const GET: RequestHandler = async () => {
	return Response.json({ status: 'ok' });
};

/**
 * GET /api/health/ready is the readiness probe (see +server.ts in the ready/ folder).
 * This file keeps the original /api/health endpoint as a pure liveness check.
 */
