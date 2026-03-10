// src/lib/server/services/reconcile.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { eq }  from 'drizzle-orm';
import { createTestDb, seedTestOffice, seedTestProduct, seedTestUser } from '../db/test-db.js';
import { createTransaction } from './transactions.js';
import { listPendingCounts, getCountDetail, reconcileCount } from './reconcile.js';
import type { SessionUser } from '../../types.js';


let ctx: ReturnType<typeof createTestDb>;
let userId: string;
let supervisorId: string;
let user: SessionUser;
let supervisor: SessionUser;

beforeEach(async () => {
  ctx = createTestDb();
  seedTestOffice(ctx.db);
  seedTestProduct(ctx.db);

  userId = seedTestUser(ctx.db, { role: 'ci_specialist', teamId: 'team-test', regionId: 'region-test' });
  supervisorId = seedTestUser(ctx.db, { role: 'supervisor', teamId: 'team-test', regionId: 'region-test' });

  user = { id: userId, name: 'CI', email: 'ci@t.com', role: 'ci_specialist', teamId: 'team-test', regionId: 'region-test' };
  supervisor = { id: supervisorId, name: 'Sup', email: 'sup@t.com', role: 'supervisor', teamId: 'team-test', regionId: 'region-test' };
});

/** Helper: record a count and return its transactionId */
async function recordCount(quantity = 5): Promise<string> {
  const { transactionId } = await createTransaction(ctx.db, ctx.schema, user, {
    action: 'inventory_count',
    officeId: 'office-test',
    performedByUserId: userId,
    lineItems: [{ productId: 'prod-test', quantity }],
  });
  return transactionId;
}

describe('listPendingCounts', () => {
  it('returns pending counts in scope', async () => {
    await recordCount();
    const counts = await listPendingCounts(ctx.db, ctx.schema, supervisor);
    expect(counts).toHaveLength(1);
    expect(counts[0].status).toBe('pending');
    expect(counts[0].officeName).toBe('Test Office');
  });

  it('returns empty when no pending counts', async () => {
    const counts = await listPendingCounts(ctx.db, ctx.schema, supervisor);
    expect(counts).toHaveLength(0);
  });

  it('excludes accepted counts', async () => {
    const txnId = await recordCount();
    await reconcileCount(ctx.db, ctx.schema, supervisor, txnId, { action: 'accept' });
    const counts = await listPendingCounts(ctx.db, ctx.schema, supervisor);
    expect(counts).toHaveLength(0);
  });
});

describe('getCountDetail', () => {
  it('returns count detail with physical and system quantities', async () => {
    // Give the office 10 units of system inventory
    ctx.db.insert(ctx.schema.currentInventory).values({
      id: 'inv-1', officeId: 'office-test', productId: 'prod-test',
      quantity: 10, updatedAt: new Date().toISOString(),
    }).run();

    const txnId = await recordCount(7); // physical count = 7
    const detail = await getCountDetail(ctx.db, ctx.schema, supervisor, txnId);

    expect(detail).not.toBeNull();
    expect(detail!.comparison).toHaveLength(1);
    expect(detail!.comparison[0].physicalQuantity).toBe(7);
    expect(detail!.comparison[0].systemQuantity).toBe(10);
    expect(detail!.comparison[0].discrepancy).toBe(-3);
  });

  it('treats missing current_inventory as system quantity 0', async () => {
    const txnId = await recordCount(4);
    const detail = await getCountDetail(ctx.db, ctx.schema, supervisor, txnId);
    expect(detail!.comparison[0].systemQuantity).toBe(0);
    expect(detail!.comparison[0].discrepancy).toBe(4);
  });

  it('returns null for unknown transactionId', async () => {
    const detail = await getCountDetail(ctx.db, ctx.schema, supervisor, 'no-such-id');
    expect(detail).toBeNull();
  });
});

describe('reconcileCount — accept', () => {
  it('sets current_inventory to the physical count (absolute, not delta)', async () => {
    // System has 10
    ctx.db.insert(ctx.schema.currentInventory).values({
      id: 'inv-1', officeId: 'office-test', productId: 'prod-test',
      quantity: 10, updatedAt: new Date().toISOString(),
    }).run();

    const txnId = await recordCount(3); // physical = 3
    await reconcileCount(ctx.db, ctx.schema, supervisor, txnId, { action: 'accept' });

    const [inv] = await ctx.db.select().from(ctx.schema.currentInventory);
    expect(inv.quantity).toBe(3); // SET to 3, not 10 + 3
  });

  it('marks the count as accepted', async () => {
    const txnId = await recordCount();
    await reconcileCount(ctx.db, ctx.schema, supervisor, txnId, { action: 'accept' });
    const [count] = await ctx.db.select().from(ctx.schema.inventoryCounts)
      .where(eq(ctx.schema.inventoryCounts.transactionId, txnId));
    expect(count.status).toBe('accepted');
    expect(count.reconciledByUserId).toBe(supervisorId);
    expect(count.reconciledAt).not.toBeNull();
  });

  it('stores reason_code and notes', async () => {
    const txnId = await recordCount();
    await reconcileCount(ctx.db, ctx.schema, supervisor, txnId, {
      action: 'accept', reasonCode: 'RECOUNT', notes: 'Verified in person',
    });
    const [count] = await ctx.db.select().from(ctx.schema.inventoryCounts)
      .where(eq(ctx.schema.inventoryCounts.transactionId, txnId));
    expect(count.reasonCode).toBe('RECOUNT');
    expect(count.reconcilerNotes).toBe('Verified in person');
  });
});

describe('reconcileCount — reject', () => {
  it('marks the count as rejected without changing inventory', async () => {
    ctx.db.insert(ctx.schema.currentInventory).values({
      id: 'inv-1', officeId: 'office-test', productId: 'prod-test',
      quantity: 10, updatedAt: new Date().toISOString(),
    }).run();

    const txnId = await recordCount(99);
    await reconcileCount(ctx.db, ctx.schema, supervisor, txnId, { action: 'reject', reasonCode: 'ERROR' });

    const [inv] = await ctx.db.select().from(ctx.schema.currentInventory);
    expect(inv.quantity).toBe(10); // unchanged

    const [count] = await ctx.db.select().from(ctx.schema.inventoryCounts)
      .where(eq(ctx.schema.inventoryCounts.transactionId, txnId));
    expect(count.status).toBe('rejected');
  });
});

describe('reconcileCount — validation', () => {
  it('throws if user lacks reconcile_count permission', async () => {
    const txnId = await recordCount();
    await expect(
      reconcileCount(ctx.db, ctx.schema, user, txnId, { action: 'accept' }) // ci_specialist
    ).rejects.toThrow('permission');
  });

  it('throws if count is not pending', async () => {
    const txnId = await recordCount();
    await reconcileCount(ctx.db, ctx.schema, supervisor, txnId, { action: 'reject' });
    await expect(
      reconcileCount(ctx.db, ctx.schema, supervisor, txnId, { action: 'accept' })
    ).rejects.toThrow('pending');
  });

  it('throws if count not found', async () => {
    await expect(
      reconcileCount(ctx.db, ctx.schema, supervisor, 'no-such-id', { action: 'accept' })
    ).rejects.toThrow('not found');
  });
});
