import { test, expect } from '@playwright/test';

/**
 * Authentication flow integration tests.
 *
 * Prerequisites:
 *   - Docker stack running: `docker compose up db redis minio pgbouncer`
 *   - Database migrated: `npm run db:migrate`
 *   - Production build: `npm run build`
 *
 * Run: npm run test:e2e
 */

const TEST_USER = {
	name: 'E2E Test User',
	email: `e2e-${Date.now()}@example.com`,
	password: 'TestPass123!'
};

test.describe('Authentication', () => {
	test('root redirects unauthenticated user to /login', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/login/);
	});

	test('register page loads', async ({ page }) => {
		await page.goto('/register');
		await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
	});

	test('register → login → logout flow', async ({ page }) => {
		// --- Register ---
		await page.goto('/register');
		await page.getByLabel(/name/i).fill(TEST_USER.name);
		await page.getByLabel(/email/i).fill(TEST_USER.email);
		await page.getByLabel('Password').fill(TEST_USER.password);
		await page.getByRole('button', { name: /create account/i }).click();

		// After successful registration the user lands on the dashboard
		await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
		await expect(page.getByText(TEST_USER.name)).toBeVisible();

		// --- Logout ---
		await page.getByRole('button', { name: /sign out/i }).click();
		await expect(page).toHaveURL(/\/login/);

		// --- Login ---
		await page.goto('/login');
		await page.getByLabel(/email/i).fill(TEST_USER.email);
		await page.getByLabel(/password/i).fill(TEST_USER.password);
		await page.getByRole('button', { name: /sign in/i }).click();

		await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
	});

	test('invalid login shows error', async ({ page }) => {
		await page.goto('/login');
		await page.getByLabel(/email/i).fill('nobody@example.com');
		await page.getByLabel(/password/i).fill('wrongpassword');
		await page.getByRole('button', { name: /sign in/i }).click();

		// Should stay on /login and show an error message
		await expect(page).toHaveURL(/\/login/);
		await expect(page.getByRole('alert').or(page.locator('[data-invalid]'))).toBeVisible({
			timeout: 5_000
		});
	});

	test('protected dashboard redirects unauthenticated to /login', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/login/);
	});
});
