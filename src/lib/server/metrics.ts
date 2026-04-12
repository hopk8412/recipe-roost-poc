import { Registry, collectDefaultMetrics, Counter, Histogram } from 'prom-client';

/**
 * Prometheus metrics registry.
 *
 * Exposed at GET /api/metrics (Prometheus text format).
 * Scraped by the `prometheus` Docker service when the `monitoring` profile is active.
 */
export const register = new Registry();

// Default Node.js process metrics (CPU, memory, event loop lag, GC, etc.)
collectDefaultMetrics({ register });

// ── Application metrics ───────────────────────────────────────────────────────

/** Total HTTP requests, labelled by method, route, and status code. */
export const httpRequestsTotal = new Counter({
	name: 'http_requests_total',
	help: 'Total number of HTTP requests',
	labelNames: ['method', 'route', 'status'],
	registers: [register]
});

/** HTTP request duration histogram (seconds). */
export const httpRequestDurationSeconds = new Histogram({
	name: 'http_request_duration_seconds',
	help: 'HTTP request duration in seconds',
	labelNames: ['method', 'route', 'status'],
	buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
	registers: [register]
});

/** Recipe operations counter. */
export const recipeOperationsTotal = new Counter({
	name: 'recipe_operations_total',
	help: 'Total recipe create/update/delete operations',
	labelNames: ['operation'],
	registers: [register]
});
