/**
 * E2E: Mobile navigation (UC-15)
 *
 * At 375px viewport width, the sidebar is hidden and a hamburger button
 * is visible. Clicking it opens the nav drawer.
 */
import { test, expect } from '@playwright/test';

const SUPERVISOR_ID = 'e2e-supervisor';

test.describe('Mobile navigation', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': SUPERVISOR_ID });
  });

  test('hamburger button is visible on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    const hamburger = page.locator('button[aria-label="Toggle menu"]');
    await expect(hamburger).toBeVisible();
  });

  test('sidebar is hidden initially on mobile', async ({ page }) => {
    await page.goto('/dashboard');
    const aside = page.locator('aside');
    // The aside has -translate-x-full when closed, making it visually hidden
    await expect(aside).toHaveClass(/-translate-x-full/);
  });

  test('clicking hamburger opens the nav drawer', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button[aria-label="Toggle menu"]');
    const aside = page.locator('aside');
    // translate-x-0 is applied when open
    await expect(aside).toHaveClass(/translate-x-0/);
  });

  test('clicking a nav link closes the drawer', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('button[aria-label="Toggle menu"]');
    // Click "Receive Order" link
    await page.click('aside >> text=Receive Order');
    await expect(page).toHaveURL(/transactions\/add/);
    // Drawer should be closed (nav returns to -translate-x-full)
    await expect(page.locator('aside')).toHaveClass(/-translate-x-full/);
  });
});
