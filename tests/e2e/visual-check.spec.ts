import { test, expect } from '@playwright/test';

test('USGS attribution link is present', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  await expect(page.locator('a[href*="usgs.gov"]')).toBeVisible();
  await expect(page.locator('a[href*="usgs.gov"]')).toHaveText('USGS');
  await page.screenshot({ path: 'test-results/01-topbar.png' });
});

test('no JS errors after selecting rover and waiting for dive', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.waitForTimeout(2000);
  await page.locator('button', { hasText: 'Perseverance' }).click();
  await page.waitForTimeout(1800); // after rotation phase -- markers visible
  await page.screenshot({ path: 'test-results/02-markers.png' });

  await page.waitForTimeout(3000); // after descent -- surface mode
  await page.screenshot({ path: 'test-results/03-surface.png' });

  expect(errors, `JS errors: ${errors.join(', ')}`).toHaveLength(0);
});

test('Curiosity dive produces no JS errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.waitForTimeout(2000);
  await page.locator('button', { hasText: 'Curiosity' }).click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'test-results/04-curiosity-surface.png' });

  expect(errors, `JS errors: ${errors.join(', ')}`).toHaveLength(0);
});
