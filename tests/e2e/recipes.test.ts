import { test, expect } from '@playwright/test';

/**
 * Recipe discovery integration tests.
 *
 * These tests cover the public-facing recipe browse and detail pages —
 * no authentication required.
 *
 * Prerequisites: seed data loaded (`npm run db:seed`).
 */

test.describe('Recipe browse page', () => {
	test('loads with recipe listing', async ({ page }) => {
		await page.goto('/recipes');
		await expect(page).toHaveURL('/recipes');
		// The page heading is always visible
		await expect(page.getByRole('heading', { name: /browse recipes/i })).toBeVisible();
	});

	test('search input triggers filtered results', async ({ page }) => {
		await page.goto('/recipes');
		const search = page.getByPlaceholder(/search recipes/i);
		await search.fill('pancake');

		// Wait for debounced navigation (400 ms) then URL update
		await expect(page).toHaveURL(/q=pancake/, { timeout: 3_000 });
	});

	test('difficulty filter buttons work', async ({ page }) => {
		await page.goto('/recipes');
		await page.getByRole('button', { name: /easy/i }).click();
		await expect(page).toHaveURL(/difficulty=easy/);
	});

	test('clear all resets filters', async ({ page }) => {
		await page.goto('/recipes?difficulty=easy');
		await page.getByRole('button', { name: /clear all/i }).click();
		await expect(page).not.toHaveURL(/difficulty/);
	});
});

test.describe('Recipe detail page', () => {
	test('seeded recipe detail loads', async ({ page }) => {
		// Navigate via listing — find the first recipe card
		await page.goto('/recipes');
		const firstCard = page.locator('a[href^="/recipes/"]').first();
		await expect(firstCard).toBeVisible({ timeout: 5_000 });
		await firstCard.click();

		// Should be on a recipe detail URL and show the title heading
		await expect(page).toHaveURL(/\/recipes\/.+/);
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('unknown recipe returns 404', async ({ page }) => {
		const response = await page.goto('/recipes/00000000-0000-0000-0000-000000000000');
		expect(response?.status()).toBe(404);
	});
});

test.describe('Security headers', () => {
	test('public pages include X-Frame-Options: DENY', async ({ page }) => {
		const response = await page.goto('/recipes');
		expect(response?.headers()['x-frame-options']).toBe('DENY');
	});

	test('public pages include X-Content-Type-Options: nosniff', async ({ page }) => {
		const response = await page.goto('/recipes');
		expect(response?.headers()['x-content-type-options']).toBe('nosniff');
	});

	test('public pages include Content-Security-Policy header', async ({ page }) => {
		const response = await page.goto('/recipes');
		expect(response?.headers()['content-security-policy']).toBeTruthy();
	});

	test('public recipe listing includes Cache-Control header', async ({ page }) => {
		const response = await page.goto('/recipes');
		const cc = response?.headers()['cache-control'] ?? '';
		expect(cc).toContain('public');
		expect(cc).toContain('max-age');
	});
});
