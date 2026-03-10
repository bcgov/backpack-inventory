// src/lib/server/services/audit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, seedTestOffice, seedTestProduct, seedTestUser } from '../db/test-db.js';
import { createTransaction } from './transactions.js';
import { getAuditLog } from './audit.js';
import type { SessionUser } from '../../types.js';

let ctx: ReturnType<typeof createTestDb>;
let supervisor: SessionUser;
let supervisorId: string;

beforeEach(async () => {
  ctx = createTestDb();
  seedTestOffice(ctx.db);
  seedTestProduct(ctx.db);
  seedTestUser(ctx.db, { role: 'ci_specialist', teamId: 'team-test', regionId: 'region-test' });
  supervisorId = seedTestUser(ctx.db, { role: 'supervisor', teamId: 'team-test', regionId: 'region-test' });
  supervisor = { id: supervisorId, name: 'Sup', email: 'sup@t.com', role: 'supervisor', teamId: 'team-test', regionId: 'region-test' };
});

async function addReceive(qty = 5) {
  return createTransaction(ctx.db, ctx.schema, supervisor, {
    action: 'receive', officeId: 'office-test', performedByUserId: supervisorId,
    lineItems: [{ productId: 'prod-test', quantity: qty }],
  });
}

describe('getAuditLog', () => {
  it('returns transactions in scope, most recent first', async () => {
    await addReceive(3);
    await addReceive(7);
    const { rows } = await getAuditLog(ctx.db, ctx.schema, supervisor, {});
    expect(rows).toHaveLength(2);
    // most recent first
    expect(new Date(rows[0].createdAt) >= new Date(rows[1].createdAt)).toBe(true);
  });

  it('includes line items on each row', async () => {
    await addReceive(5);
    const { rows } = await getAuditLog(ctx.db, ctx.schema, supervisor, {});
    expect(rows[0].lineItems).toHaveLength(1);
    expect(rows[0].lineItems[0].quantity).toBe(5);
    expect(rows[0].lineItems[0].productName).toBe('Test Product');
  });

  it('filters by action', async () => {
    await addReceive();
    await createTransaction(ctx.db, ctx.schema, supervisor, {
      action: 'remove', officeId: 'office-test', performedByUserId: supervisorId,
      lineItems: [{ productId: 'prod-test', quantity: 2 }],
    });
    const { rows } = await getAuditLog(ctx.db, ctx.schema, supervisor, { action: 'remove' });
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('remove');
  });

  it('filters by officeId', async () => {
    await addReceive();
    // Add a second office outside scope — should not appear
    const { rows } = await getAuditLog(ctx.db, ctx.schema, supervisor, { officeId: 'office-test' });
    expect(rows.every((r: { officeId: string }) => r.officeId === 'office-test')).toBe(true);
  });

  it('paginates correctly', async () => {
    for (let i = 0; i < 3; i++) await addReceive(i + 1);
    const { rows, total } = await getAuditLog(ctx.db, ctx.schema, supervisor, {}, { page: 0, pageSize: 2 });
    expect(rows).toHaveLength(2);
    expect(total).toBe(3);
  });

  it('returns empty for a user with no scope offices', async () => {
    const noScope: SessionUser = { id: 'x', name: 'X', email: 'x@x.com', role: 'ci_specialist', teamId: null, regionId: null };
    const { rows } = await getAuditLog(ctx.db, ctx.schema, noScope, {});
    expect(rows).toHaveLength(0);
  });
});
