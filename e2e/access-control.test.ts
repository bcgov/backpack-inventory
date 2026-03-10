/**
 * E2E: Role-based access control
 *
 * Tests that protected routes reject users without the required permission,
 * and allow users who have it.
 */
import { test, expect } from '@playwright/test';

const SUPERVISOR_ID    = 'e2e-supervisor';   // has reconcile_count, view_audit_log
const CI_ID            = 'e2e-ci';           // does NOT have reconcile_count

test.describe('Access control', () => {
  test('unauthenticated request to /dashboard redirects to sign-in', async ({ page }) => {
    // No x-test-user-id header set
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/auth\/signin/);
  });

  test('ci_specialist cannot access /reconcile — gets 403', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': CI_ID });
    const response = await page.goto('/reconcile');
    // SvelteKit serves a 403 page; either check status or page content
    expect(response?.status()).toBe(403);
  });

  test('supervisor can access /reconcile', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': SUPERVISOR_ID });
    await page.goto('/reconcile');
    await expect(page).not.toHaveURL(/auth\/signin/);
    // Should show the reconcile page content (not an error)
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('ci_specialist cannot access /audit-log — gets 403', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': CI_ID });
    const response = await page.goto('/audit-log');
    expect(response?.status()).toBe(403);
  });

  test('supervisor can access /audit-log', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': SUPERVISOR_ID });
    await page.goto('/audit-log');
    await expect(page).not.toHaveURL(/auth\/signin/);
    await expect(page.locator('h1, h2, table').first()).toBeVisible();
  });

  test('ci_specialist cannot access /admin/users — gets 403', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': CI_ID });
    const response = await page.goto('/admin/users');
    expect(response?.status()).toBe(403);
  });

  test('supervisor can access /admin/users', async ({ page }) => {
    await page.setExtraHTTPHeaders({ 'x-test-user-id': SUPERVISOR_ID });
    await page.goto('/admin/users');
    await expect(page).not.toHaveURL(/auth\/signin/);
    await expect(page.locator('table, h1').first()).toBeVisible();
  });
});
