/**
 * E2E: Inventory Count happy path (UC-9)
 *
 * A CI specialist navigates to /inventory-count, selects an office,
 * enters at least one product count, and submits.
 * Expects a confirmation banner to appear.
 */
import { test, expect } from '@playwright/test';

const CI_ID = 'e2e-ci';

test.describe('Inventory Count (UC-9)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': CI_ID });
  });

  test('submits an inventory count and shows confirmation', async ({ page }) => {
    await page.goto('/inventory-count');
    await expect(page).not.toHaveURL(/auth\/signin/);

    // Select the first office
    const officeSelect = page.locator('select[name="officeId"]');
    await officeSelect.selectOption({ index: 1 });

    // Fill in a quantity for the first product input (qty_{productId} pattern)
    const firstQtyInput = page.locator('input[type="number"]').first();
    await firstQtyInput.fill('3');

    await page.click('button[type="submit"]');

    await expect(page.locator('text=Confirmation ID')).toBeVisible({ timeout: 5000 });
  });
});
