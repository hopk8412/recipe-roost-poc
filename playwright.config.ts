import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Recipe Roost integration tests.
 *
 * Tests run against the SvelteKit preview server (production build).
 * Start the full Docker stack before running: `docker compose up db redis minio pgbouncer`
 *
 * Run tests:  npm run test:e2e
 */
export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false, // sequential to avoid shared-state issues between auth tests
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: process.env.CI ? 'github' : 'list',

	use: {
		baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4173',
		trace: 'on-first-retry'
	},

	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	],

	// Start the preview server automatically (production build must exist: npm run build)
	webServer: {
		command: 'npm run preview',
		url: 'http://localhost:4173',
		reuseExistingServer: !process.env.CI,
		timeout: 30_000
	}
});
