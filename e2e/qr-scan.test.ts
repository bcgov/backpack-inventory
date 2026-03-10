import { test, expect } from '@playwright/test';

// These IDs must match what e2e/global-setup.ts seeds.
const SUPERVISOR_ID = 'e2e-supervisor';
const OFFICE_ID     = 'office-test';
const PRODUCT_ID    = 'prod-test';

test.describe('QR scan flow', () => {
  test('unauthenticated user is redirected to sign-in', async ({ page }) => {
    await page.goto(`/scan/${OFFICE_ID}/${PRODUCT_ID}`);
    await expect(page).toHaveURL(/auth\/signin/);
  });

  test('authenticated user sees pre-filled office and product', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': SUPERVISOR_ID });
    await page.goto(`/scan/${OFFICE_ID}/${PRODUCT_ID}`);

    // The page should show the product and office names (not require user to select them)
    await expect(page.getByText('Test Product')).toBeVisible();
    await expect(page.getByText('Test Office')).toBeVisible();

    // The action + quantity form should be present
    await expect(page.getByRole('radio', { name: 'Receive' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Remove' })).toBeVisible();
    await expect(page.getByLabel('Quantity')).toBeVisible();

    // There should be NO office selector dropdown
    await expect(page.getByLabel('Office')).not.toBeVisible();
  });

  test('submitting the form shows a confirmation number', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': SUPERVISOR_ID });

    // Receive some stock first so the remove below succeeds
    await page.goto(`/scan/${OFFICE_ID}/${PRODUCT_ID}`);
    // Radio inputs are sr-only; click the visible label span instead
    await page.locator('label', { hasText: 'Receive' }).click();
    await page.getByLabel('Quantity').fill('10');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Transaction recorded')).toBeVisible();

    // Now remove some
    await page.getByRole('link', { name: 'Record Another' }).click();
    await page.locator('label', { hasText: 'Remove' }).click();
    await page.getByLabel('Quantity').fill('3');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Transaction recorded')).toBeVisible();
    await expect(page.locator('p.font-mono')).toContainText(/[A-F0-9]{8}/);
  });

  test('unknown office returns 404', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': SUPERVISOR_ID });
    const response = await page.goto('/scan/nonexistent-office/prod-test');
    expect(response?.status()).toBe(404);
  });

  test('admin QR codes page shows office selector and QR images', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': SUPERVISOR_ID });
    await page.goto('/admin/qr-codes');

    await expect(page.getByRole('link', { name: 'QR Codes' })
      .or(page.getByText('QR Codes'))).toBeVisible();

    // Office dropdown should be present
    await expect(page.locator('select[name="officeId"]')).toBeVisible();

    // QR images pointing to the per-office API route
    const qrImages = page.locator('img[src*="/api/qr/"]');
    await expect(qrImages.first()).toBeVisible();

    // Each image src should contain two path segments after /api/qr/
    const src = await qrImages.first().getAttribute('src');
    expect(src).toMatch(/\/api\/qr\/[^/]+\/[^/]+/);
  });
});
