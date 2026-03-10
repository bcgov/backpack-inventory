import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, seedTestOffice, seedTestProduct, seedTestUser } from '../db/test-db.js';
import { createTransaction } from './transactions.js';
import { getInventoryWithForecast } from './forecast.js';
import type { SessionUser } from '../../types.js';
import type { ForecastConfig } from '../../types.js';

const CONFIG: ForecastConfig = { burnRateDays: 30, greenDays: 30, yellowDays: 14 };

let ctx: ReturnType<typeof createTestDb>;
let userId: string;
let supervisor: SessionUser;

beforeEach(() => {
  ctx = createTestDb();
  seedTestOffice(ctx.db);
  seedTestProduct(ctx.db);
  userId = seedTestUser(ctx.db, { role: 'supervisor', teamId: 'team-test', regionId: 'region-test' });
  supervisor = {
    id: userId, name: 'Sup', email: 'sup@t.com',
    role: 'supervisor', teamId: 'team-test', regionId: 'region-test',
  };
});

async function receive(qty: number) {
  await createTransaction(ctx.db, ctx.schema, supervisor, {
    action: 'receive', officeId: 'office-test', performedByUserId: userId,
    lineItems: [{ productId: 'prod-test', quantity: qty }],
  });
}

async function remove(qty: number) {
  await createTransaction(ctx.db, ctx.schema, supervisor, {
    action: 'remove', officeId: 'office-test', performedByUserId: userId,
    lineItems: [{ productId: 'prod-test', quantity: qty }],
  });
}

describe('getInventoryWithForecast', () => {
  it('returns empty array when no inventory', async () => {
    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    expect(rows).toHaveLength(0);
  });

  it('includes current quantity on each row', async () => {
    await receive(20);
    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    expect(rows[0].currentQty).toBe(20);
  });

  it('computes a non-null burn rate when removals exist', async () => {
    await receive(50);
    await remove(5);
    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    expect(rows[0].dailyBurnRate).not.toBeNull();
    expect(rows[0].dailyBurnRate).toBeGreaterThan(0);
  });

  it('burn rate is null when there are no removals', async () => {
    await receive(20);
    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    // No remove transactions → burn rate 0 → treated as null
    expect(rows[0].daysRemaining).toBeNull();
  });

  it('daysRemaining is 0 when stock is empty even with prior removals', async () => {
    await receive(5);
    await remove(5);
    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    expect(rows[0].currentQty).toBe(0);
    expect(rows[0].daysRemaining).toBe(0);
  });

  it('color is none when no removal history', async () => {
    await receive(100);
    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    expect(rows[0].color).toBe('none');
  });

  it('color is green when days remaining > greenDays', async () => {
    // Stock: 1000, remove 1 per day → 1000 days remaining → green
    await receive(1000);
    await remove(1);
    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    expect(rows[0].color).toBe('green');
  });

  it('color is red when days remaining < yellowDays', async () => {
    // Stock: 5, remove 5 per day → 1 day remaining → red
    await receive(100);
    await remove(5); // 5 per day (all on today, so intercept ≈ 5)

    // Set qty to 5 directly so daysRemaining = ceil(5/5) = 1 < yellowDays=14 → red
    ctx.db.insert(ctx.schema.currentInventory).values({
      id: 'inv-override', officeId: 'office-test', productId: 'prod-test',
      quantity: 5, updatedAt: new Date().toISOString(),
    }).onConflictDoUpdate({
      target: [ctx.schema.currentInventory.officeId, ctx.schema.currentInventory.productId],
      set: { quantity: 5, updatedAt: new Date().toISOString() },
    }).run();

    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    // 5 units / 5 per day = 1 day → red (< yellowDays=14)
    expect(rows[0].color).toBe('red');
  });

  it('burnRateSource is "local" when office has its own removal data', async () => {
    await receive(50);
    await remove(3);
    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    expect(rows[0].burnRateSource).toBe('local');
  });

  it('burnRateSource is "none" when no removal data exists anywhere', async () => {
    await receive(20);
    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    expect(rows[0].burnRateSource).toBe('none');
  });

  it('filters to a specific officeId when provided', async () => {
    await receive(10);
    const rows = await getInventoryWithForecast(
      ctx.db, ctx.schema, supervisor, 'office-test', CONFIG,
    );
    expect(rows.every((r) => r.officeId === 'office-test')).toBe(true);
  });

  it('includes office and product name on each row', async () => {
    await receive(5);
    const rows = await getInventoryWithForecast(ctx.db, ctx.schema, supervisor, undefined, CONFIG);
    expect(rows[0].officeName).toBe('Test Office');
    expect(rows[0].productName).toBe('Test Product');
  });
});
