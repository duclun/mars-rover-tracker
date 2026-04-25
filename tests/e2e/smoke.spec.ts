import { test, expect } from '@playwright/test';

test.describe('M1 smoke', () => {
  test('page loads, canvas visible, no JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    // Wait for Three.js to initialise (textures may be loading)
    await page.waitForTimeout(3000);

    // Canvas must be in the DOM
    await expect(page.locator('canvas')).toBeVisible();

    // TopBar must be visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('text=Mars Rover Tracker')).toBeVisible();

    // No page-level JS exceptions
    expect(errors, `JS errors: ${errors.join(', ')}`).toHaveLength(0);
  });

  test('NASA attribution link is present', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('a[href="https://mars.nasa.gov/"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('NASA/JPL-Caltech');
  });
});
