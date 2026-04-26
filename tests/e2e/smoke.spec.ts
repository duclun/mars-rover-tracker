import { test, expect } from '@playwright/test';

test.describe('M1 smoke', () => {
  test('page loads, canvas visible, no JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForTimeout(3000);

    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=Mars Rover Tracker')).toBeVisible();

    expect(errors, `JS errors: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('NASA attribution link is present', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a[href="https://mars.nasa.gov/"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('NASA/JPL-Caltech');
  });
});

test.describe('M2 smoke', () => {
  test('RoverPicker chips are visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Perseverance')).toBeVisible();
    await expect(page.locator('text=Curiosity')).toBeVisible();
  });

  test('clicking Perseverance opens the DataDrawer', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.locator('button', { hasText: 'Perseverance' }).click();
    await expect(page.locator('text=/Sol \\d+/')).toBeVisible();
  });

  test('DataDrawer closes on X button click', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    await page.locator('button', { hasText: 'Perseverance' }).click();
    await expect(page.locator('text=/Sol \\d+/')).toBeVisible();
    await page.locator('button[aria-label="Close drawer"]').click();
    await expect(page.locator('text=/Sol \\d+/')).not.toBeVisible();
  });

  test('mobile viewport shows no canvas', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=/desktop/i')).toBeVisible();
    await expect(page.locator('canvas')).not.toBeVisible();
  });
});
