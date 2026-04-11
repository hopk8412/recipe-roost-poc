import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	try {
		await db.execute(sql`SELECT 1`);
		return Response.json({ status: 'ok', db: 'connected' });
	} catch (err) {
		const message = err instanceof Error ? err.message : 'unknown error';
		return Response.json({ status: 'error', db: message }, { status: 503 });
	}
};
