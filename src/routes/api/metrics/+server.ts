import type { RequestHandler } from '@sveltejs/kit';
import { register } from '$lib/server/metrics';

/**
 * GET /api/metrics — Prometheus scrape endpoint.
 *
 * Returns metrics in Prometheus text exposition format.
 * Restrict access to internal networks in production (reverse-proxy / firewall).
 */
export const GET: RequestHandler = async () => {
	const metrics = await register.metrics();
	return new Response(metrics, {
		headers: { 'Content-Type': register.contentType }
	});
};
