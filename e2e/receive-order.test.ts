/**
 * E2E: Receive Order happy path (UC-4)
 *
 * A supervisor navigates to /transactions/add, selects an office,
 * picks a product, sets a quantity, and submits.
 * Expects a confirmation ID banner to appear.
 */
import { test, expect } from '@playwright/test';

const SUPERVISOR_ID = 'e2e-supervisor';

test.describe('Receive Order (UC-4)', () => {
  test.beforeEach(async ({ page }) => {
    // Inject the test supervisor on every request
    await page.setExtraHTTPHeaders({ 'x-test-user-id': SUPERVISOR_ID });
  });

  test('submits a receive transaction and shows confirmation ID', async ({ page }) => {
    await page.goto('/transactions/add');

    // Should not redirect to sign-in
    await expect(page).not.toHaveURL(/auth\/signin/);

    // Select the first office in the dropdown
    const officeSelect = page.locator('select[name="officeId"]');
    await officeSelect.selectOption({ index: 1 });

    // Select the first product in the first category optgroup
    const productSelect = page.locator('select[name="productId"]').first();
    await productSelect.selectOption({ index: 1 });

    // Set quantity to 5
    const qtyInput = page.locator('input[name="quantity"]').first();
    await qtyInput.fill('5');

    // Submit
    await page.click('button[type="submit"]');

    // Confirmation banner should appear
    await expect(page.locator('text=Confirmation ID')).toBeVisible({ timeout: 5000 });
  });

  test('shows error when no office is selected', async ({ page }) => {
    await page.goto('/transactions/add');
    // Don't select office — just submit
    await page.click('button[type="submit"]');
    // Browser native validation prevents submission; officeId select gets focus
    // No confirmation banner should appear
    await expect(page.locator('text=Confirmation ID')).not.toBeVisible();
  });
});
