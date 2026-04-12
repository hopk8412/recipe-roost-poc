import { defineConfig } from 'drizzle-kit';

// Migrations must run against the database directly (not through PgBouncer)
// because DDL statements are not compatible with transaction pooling mode.
// Use DATABASE_URL_DIRECT (direct PG connection) when set, otherwise fall back
// to DATABASE_URL (works fine for local dev without PgBouncer in the path).
const migrationUrl = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!migrationUrl) throw new Error('DATABASE_URL or DATABASE_URL_DIRECT is not set');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: migrationUrl },
	verbose: true,
	strict: true
});
