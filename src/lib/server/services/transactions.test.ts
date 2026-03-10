// src/lib/server/services/transactions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb, seedTestOffice, seedTestProduct, seedTestUser } from '../db/test-db.js';
import { createTransaction } from './transactions.js';
import type { SessionUser } from '../../types.js';

let ctx: ReturnType<typeof createTestDb>;
let user: SessionUser;
let userId: string;

beforeEach(() => {
  ctx = createTestDb();
  seedTestOffice(ctx.db);
  seedTestProduct(ctx.db);
  userId = seedTestUser(ctx.db, { role: 'ci_specialist', teamId: 'team-test', regionId: 'region-test' });
  user = { id: userId, name: 'Test', email: 'test@example.com', role: 'ci_specialist', teamId: 'team-test', regionId: 'region-test' };
});

describe('createTransaction — receive', () => {
  it('returns an 8-char uppercase hex confirmation ID', async () => {
    const { confirmationId } = await createTransaction(ctx.db, ctx.schema, user, {
      action: 'receive',
      officeId: 'office-test',
      performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 10 }],
    });
    expect(confirmationId).toMatch(/^[0-9A-F]{8}$/);
  });

  it('increments current_inventory', async () => {
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'receive',
      officeId: 'office-test',
      performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 5 }],
    });
    const inv = await ctx.db.select().from(ctx.schema.currentInventory);
    expect(inv[0].quantity).toBe(5);
  });

  it('stores the transaction and line items', async () => {
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'receive',
      officeId: 'office-test',
      performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 3 }],
    });
    const txns = await ctx.db.select().from(ctx.schema.transactions);
    const items = await ctx.db.select().from(ctx.schema.transactionLineItems);
    expect(txns).toHaveLength(1);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });
});

describe('createTransaction — remove', () => {
  it('decrements current_inventory', async () => {
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'receive', officeId: 'office-test', performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 10 }],
    });
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'remove', officeId: 'office-test', performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 4 }],
    });
    const inv = await ctx.db.select().from(ctx.schema.currentInventory);
    expect(inv[0].quantity).toBe(6);
  });

  it('throws when quantity exceeds available inventory', async () => {
    // Stock up 5, try to remove 6
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'receive', officeId: 'office-test', performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 5 }],
    });
    await expect(
      createTransaction(ctx.db, ctx.schema, user, {
        action: 'remove', officeId: 'office-test', performedByUserId: userId,
        lineItems: [{ productId: 'prod-test', quantity: 6 }],
      })
    ).rejects.toThrow('Insufficient inventory');
  });

  it('does not modify inventory when remove exceeds available stock', async () => {
    // Stock up 5
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'receive', officeId: 'office-test', performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 5 }],
    });
    // Try to remove 6 — should fail
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'remove', officeId: 'office-test', performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 6 }],
    }).catch(() => { /* expected */ });
    // Inventory must still be 5
    const inv = await ctx.db.select().from(ctx.schema.currentInventory);
    expect(inv[0].quantity).toBe(5);
  });

  it('throws when removing from an office with no inventory record', async () => {
    // No receive has happened — no row in currentInventory
    await expect(
      createTransaction(ctx.db, ctx.schema, user, {
        action: 'remove', officeId: 'office-test', performedByUserId: userId,
        lineItems: [{ productId: 'prod-test', quantity: 1 }],
      })
    ).rejects.toThrow('Insufficient inventory');
  });
});

describe('createTransaction — return', () => {
  it('increments current_inventory', async () => {
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'return', officeId: 'office-test', performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 2 }],
    });
    const inv = await ctx.db.select().from(ctx.schema.currentInventory);
    expect(inv[0].quantity).toBe(2);
  });
});

describe('createTransaction — validation', () => {
  it('throws if lineItems is empty', async () => {
    await expect(
      createTransaction(ctx.db, ctx.schema, user, {
        action: 'receive', officeId: 'office-test', performedByUserId: userId,
        lineItems: [],
      })
    ).rejects.toThrow('at least one item');
  });

  it('throws if office is not in user scope', async () => {
    await expect(
      createTransaction(ctx.db, ctx.schema, user, {
        action: 'receive', officeId: 'other-office', performedByUserId: userId,
        lineItems: [{ productId: 'prod-test', quantity: 1 }],
      })
    ).rejects.toThrow('not in your scope');
  });

  it('throws if record_on_behalf used without permission', async () => {
    const otherUserId = seedTestUser(ctx.db, { role: 'ci_specialist', teamId: 'team-test' });
    await expect(
      createTransaction(ctx.db, ctx.schema, user, {
        action: 'remove', officeId: 'office-test',
        performedByUserId: otherUserId, // different from the logged-in user
        lineItems: [{ productId: 'prod-test', quantity: 1 }],
      })
    ).rejects.toThrow('record on behalf');
  });
});

describe('createTransaction — redistribute', () => {
  it('decrements source office and increments destination', async () => {
    // Give source some stock first
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'receive', officeId: 'office-test', performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 10 }],
    });

    // Create a second office to redistribute to
    const { db, schema } = ctx;
    db.insert(schema.offices).values({
      id: 'office-dest', teamId: 'team-test', regionId: 'region-test', officeNumber: '998',
      name: 'Dest Office', isActive: true, createdAt: new Date().toISOString(),
    }).run();

    const supervisor: SessionUser = {
      id: userId, name: 'Test', email: 'test@example.com',
      role: 'supervisor', teamId: 'team-test', regionId: 'region-test',
    };

    await createTransaction(ctx.db, ctx.schema, supervisor, {
      action: 'redistribute',
      officeId: 'office-test',
      destinationOfficeId: 'office-dest',
      performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 4 }],
    });

    const inv = await ctx.db
      .select({ officeId: schema.currentInventory.officeId, quantity: schema.currentInventory.quantity })
      .from(schema.currentInventory)
      .orderBy(schema.currentInventory.officeId);

    expect(inv.find((r: { officeId: string }) => r.officeId === 'office-test')?.quantity).toBe(6);
    expect(inv.find((r: { officeId: string }) => r.officeId === 'office-dest')?.quantity).toBe(4);
  });

  it('throws when source has insufficient inventory for redistribution', async () => {
    ctx.db.insert(ctx.schema.offices).values({
      id: 'office-dest', teamId: 'team-test', regionId: 'region-test', officeNumber: '996',
      name: 'Dest3', isActive: true, createdAt: new Date().toISOString(),
    }).run();

    // Only 2 in stock, trying to redistribute 5
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'receive', officeId: 'office-test', performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 2 }],
    });

    await expect(
      createTransaction(ctx.db, ctx.schema, { ...user, role: 'supervisor' }, {
        action: 'redistribute',
        officeId: 'office-test',
        destinationOfficeId: 'office-dest',
        performedByUserId: userId,
        lineItems: [{ productId: 'prod-test', quantity: 5 }],
      })
    ).rejects.toThrow('Insufficient inventory');
  });

  it('creates a redistribution_details row', async () => {
    ctx.db.insert(ctx.schema.offices).values({
      id: 'office-dest', teamId: 'team-test', regionId: 'region-test', officeNumber: '997',
      name: 'Dest2', isActive: true, createdAt: new Date().toISOString(),
    }).run();

    // Seed stock before redistributing
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'receive', officeId: 'office-test', performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 5 }],
    });

    await createTransaction(ctx.db, ctx.schema, { ...user, role: 'supervisor' }, {
      action: 'redistribute',
      officeId: 'office-test',
      destinationOfficeId: 'office-dest',
      performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 1 }],
    });

    const details = await ctx.db.select().from(ctx.schema.redistributionDetails);
    expect(details).toHaveLength(1);
    expect(details[0].destinationOfficeId).toBe('office-dest');
  });
});

describe('createTransaction — inventory_count', () => {
  it('creates an inventory_counts row with status pending', async () => {
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'inventory_count',
      officeId: 'office-test',
      performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 7 }],
    });

    const counts = await ctx.db.select().from(ctx.schema.inventoryCounts);
    expect(counts).toHaveLength(1);
    expect(counts[0].status).toBe('pending');
  });

  it('does NOT change current_inventory', async () => {
    await createTransaction(ctx.db, ctx.schema, user, {
      action: 'inventory_count',
      officeId: 'office-test',
      performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 99 }],
    });

    const inv = await ctx.db.select().from(ctx.schema.currentInventory);
    expect(inv).toHaveLength(0);
  });

  it('links the inventory_counts row to the transaction', async () => {
    const { transactionId } = await createTransaction(ctx.db, ctx.schema, user, {
      action: 'inventory_count',
      officeId: 'office-test',
      performedByUserId: userId,
      lineItems: [{ productId: 'prod-test', quantity: 3 }],
    });

    const [count] = await ctx.db
      .select()
      .from(ctx.schema.inventoryCounts)
      .where(eq(ctx.schema.inventoryCounts.transactionId, transactionId));

    expect(count).toBeDefined();
    expect(count.transactionId).toBe(transactionId);
  });
});
