// src/lib/server/services/inventory.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDb, seedTestOffice, seedTestProduct } from '../db/test-db.js';
import { adjustInventory, getCurrentInventory } from './inventory.js';
import type { SessionUser } from '../../types.js';

let ctx: ReturnType<typeof createTestDb>;

beforeEach(() => {
  ctx = createTestDb();
  seedTestOffice(ctx.db);
  seedTestProduct(ctx.db);
});

describe('adjustInventory', () => {
  it('creates a new inventory row if none exists', async () => {
    await adjustInventory(ctx.db, ctx.schema, 'office-test', 'prod-test', 5);
    const rows = await ctx.db.select().from(ctx.schema.currentInventory);
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(5);
  });

  it('increments an existing row', async () => {
    await adjustInventory(ctx.db, ctx.schema, 'office-test', 'prod-test', 5);
    await adjustInventory(ctx.db, ctx.schema, 'office-test', 'prod-test', 3);
    const rows = await ctx.db.select().from(ctx.schema.currentInventory);
    expect(rows[0].quantity).toBe(8);
  });

  it('decrements an existing row', async () => {
    await adjustInventory(ctx.db, ctx.schema, 'office-test', 'prod-test', 10);
    await adjustInventory(ctx.db, ctx.schema, 'office-test', 'prod-test', -4);
    const rows = await ctx.db.select().from(ctx.schema.currentInventory);
    expect(rows[0].quantity).toBe(6);
  });
});

describe('getCurrentInventory', () => {
  it('returns inventory rows in user scope', async () => {
    await adjustInventory(ctx.db, ctx.schema, 'office-test', 'prod-test', 7);
    const user: SessionUser = {
      id: 'u1', name: 'T', email: 't@t.com',
      role: 'ci_specialist', teamId: 'team-test', regionId: 'region-test',
    };
    const rows = await getCurrentInventory(ctx.db, ctx.schema, user);
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(7);
    expect(rows[0].officeName).toBe('Test Office');
    expect(rows[0].productName).toBe('Test Product');
  });

  it('filters to a specific office when officeId provided', async () => {
    await adjustInventory(ctx.db, ctx.schema, 'office-test', 'prod-test', 3);
    const user: SessionUser = {
      id: 'u1', name: 'T', email: 't@t.com',
      role: 'ci_specialist', teamId: 'team-test', regionId: 'region-test',
    };
    const rows = await getCurrentInventory(ctx.db, ctx.schema, user, 'office-test');
    expect(rows).toHaveLength(1);
  });
});
