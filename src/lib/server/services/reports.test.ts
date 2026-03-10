// src/lib/server/services/reports.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, seedTestOffice, seedTestProduct, seedTestUser } from '../db/test-db.js';
import { createTransaction } from './transactions.js';
import { getTransactionHistory, getUsageByStaff } from './reports.js';
import type { SessionUser } from '../../types.js';

let ctx: ReturnType<typeof createTestDb>;
let supervisorId: string;
let supervisor: SessionUser;

beforeEach(async () => {
  ctx = createTestDb();
  seedTestOffice(ctx.db);
  seedTestProduct(ctx.db);
  supervisorId = seedTestUser(ctx.db, { role: 'supervisor', teamId: 'team-test', regionId: 'region-test' });
  supervisor = { id: supervisorId, name: 'Sup', email: 'sup@t.com', role: 'supervisor', teamId: 'team-test', regionId: 'region-test' };
});

async function doTxn(action: 'receive' | 'remove', qty = 5) {
  return createTransaction(ctx.db, ctx.schema, supervisor, {
    action, officeId: 'office-test', performedByUserId: supervisorId,
    lineItems: [{ productId: 'prod-test', quantity: qty }],
  });
}

describe('getTransactionHistory', () => {
  it('returns one row per action type per month', async () => {
    await doTxn('receive', 10);
    await doTxn('receive', 5);
    await doTxn('remove',  3);
    const rows = await getTransactionHistory(ctx.db, ctx.schema, supervisor, {});
    // Should have 2 distinct action types for the current month
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const receive = rows.find((r: { action: string }) => r.action === 'receive');
    expect(receive?.txnCount).toBe(2);
    expect(receive?.totalItems).toBe(15);
  });

  it('returns empty when no transactions', async () => {
    const rows = await getTransactionHistory(ctx.db, ctx.schema, supervisor, {});
    expect(rows).toHaveLength(0);
  });
});

describe('getUsageByStaff', () => {
  it('returns one row per user per action type', async () => {
    await doTxn('receive');
    await doTxn('receive');
    await doTxn('remove');
    const rows = await getUsageByStaff(ctx.db, ctx.schema, supervisor);
    const receives = rows.filter((r: { action: string }) => r.action === 'receive');
    expect(receives[0]?.txnCount).toBe(2);
  });

  it('returns empty when no transactions', async () => {
    const rows = await getUsageByStaff(ctx.db, ctx.schema, supervisor);
    expect(rows).toHaveLength(0);
  });
});
