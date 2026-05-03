import { describe, it, expect, beforeAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './test-db.js';
import { runDevSeed } from './seed-dev.js';
import * as schema from './schema/sqlite.js';

/**
 * The dev seed expects the production reference data (regions, teams, offices,
 * categories, products) to already exist. This helper inserts the minimum
 * subset our dev users + bulk gen need to operate.
 */
function seedReferenceFixtures(db: ReturnType<typeof createTestDb>['db']) {
  const now = new Date().toISOString();

  // Island region + VI Central North team — required for dev-ci/supervisor/asst-sup binding.
  db.insert(schema.regions).values({
    id: 'region-island', name: 'Island', slug: 'island', createdAt: now,
  }).run();
  db.insert(schema.teams).values({
    id: 'team-vi-central-north', regionId: 'region-island',
    name: 'VI Central North', slug: 'vi_central_north', createdAt: now,
  }).run();

  // Six VI Central North offices (matches production seed numbering).
  const islandTeamOffices = [
    ['office-129', '129', 'Duncan'],
    ['office-132', '132', 'Nanaimo'],
    ['office-138', '138', 'Port Alberni'],
    ['office-139', '139', 'Courtenay/Comox'],
    ['office-143', '143', 'Campbell River'],
    ['office-144', '144', 'Port Hardy'],
  ] as const;
  for (const [id, num, name] of islandTeamOffices) {
    db.insert(schema.offices).values({
      id, teamId: 'team-vi-central-north', regionId: 'region-island',
      officeNumber: num, name, isActive: true, createdAt: now,
    }).run();
  }

  // One non-Island region/team/office, used for the inactive-office fixture.
  db.insert(schema.regions).values({
    id: 'region-northern', name: 'Northern', slug: 'northern', createdAt: now,
  }).run();
  db.insert(schema.teams).values({
    id: 'team-north', regionId: 'region-northern',
    name: 'North', slug: 'north', createdAt: now,
  }).run();
  db.insert(schema.offices).values({
    id: 'office-589', teamId: 'team-north', regionId: 'region-northern',
    officeNumber: '589', name: 'Smithers', isActive: true, createdAt: now,
  }).run();
}

describe('runDevSeed — dev users', () => {
  let ctx: ReturnType<typeof createTestDb>;

  beforeAll(async () => {
    ctx = createTestDb();
    seedReferenceFixtures(ctx.db);
    seedReferenceProducts(ctx.db);
    await runDevSeed(ctx.db, schema, ctx.sqlite);
  });

  it('inserts exactly 6 dev users, one per role', () => {
    const users = ctx.db.select().from(schema.users).all()
      .filter((u) => u.id.startsWith('dev-'));
    expect(users).toHaveLength(6);
    const roles = users.map((u) => u.role).sort();
    expect(roles).toEqual([
      'aaa',
      'assistant_supervisor',
      'ci_specialist',
      'director_3p',
      'manager',
      'supervisor',
    ]);
  });

  it('binds team-scoped users to VI Central North', () => {
    const ci = ctx.db.select().from(schema.users)
      .where(eq(schema.users.id, 'dev-ci')).all()[0];
    expect(ci?.teamId).toBe('team-vi-central-north');
    expect(ci?.regionId).toBe('region-island');
  });

  it('binds region-scoped users to Island region without a team', () => {
    const aaa = ctx.db.select().from(schema.users)
      .where(eq(schema.users.id, 'dev-aaa')).all()[0];
    expect(aaa?.teamId).toBeNull();
    expect(aaa?.regionId).toBe('region-island');
  });

  it('binds the director with no team or region', () => {
    const dir = ctx.db.select().from(schema.users)
      .where(eq(schema.users.id, 'dev-director')).all()[0];
    expect(dir?.teamId).toBeNull();
    expect(dir?.regionId).toBeNull();
  });
});

import { sql } from 'drizzle-orm';

/** Add categories + products needed for bulk gen. Call after seedReferenceFixtures. */
function seedReferenceProducts(db: ReturnType<typeof createTestDb>['db']) {
  const now = new Date().toISOString();
  const categories = [
    ['cat-cereal',   'Cereal Bar/Snack', 1],
    ['cat-clothing', 'Clothing Item',    2],
    ['cat-ensure',   'Ensure',           3],
  ] as const;
  for (const [id, name, sort] of categories) {
    db.insert(schema.productCategories).values({
      id, name, slug: id, sortOrder: sort, createdAt: now,
    }).run();
  }
  const products = [
    ['prod-apple',        'cat-cereal',   'Apple',     'apple',     false],
    ['prod-blueberry',    'cat-cereal',   'Blueberry', 'blueberry', false],
    ['prod-other-cereal', 'cat-cereal',   'Other Cereal Bar/Snack', 'other_cereal_bar_snack', true],
    ['prod-socks',        'cat-clothing', 'Socks',     'socks',     false],
    ['prod-vanilla',      'cat-ensure',   'Vanilla',   'vanilla',   false],
    ['prod-chocolate',    'cat-ensure',   'Chocolate', 'chocolate', false],
  ] as const;
  for (const [id, cat, name, slug, isOther] of products) {
    db.insert(schema.products).values({
      id, categoryId: cat, name, slug, isOther, isActive: true, createdAt: now,
    }).run();
  }
}

describe('runDevSeed — bulk history', () => {
  let ctx: ReturnType<typeof createTestDb>;

  beforeAll(async () => {
    ctx = createTestDb();
    seedReferenceFixtures(ctx.db);
    seedReferenceProducts(ctx.db);
    await runDevSeed(ctx.db, schema, ctx.sqlite);
  });

  it('generates a substantial volume of transactions', () => {
    const rows = ctx.db.select({ c: sql<number>`count(*)` })
      .from(schema.transactions).all();
    expect(rows[0]?.c ?? 0).toBeGreaterThan(1000);
  });

  it('spans at least 30 distinct days (forecast prerequisite)', () => {
    // SQLite doesn't resolve SELECT-list aliases in GROUP BY; collect into a Set in JS.
    const rows = ctx.db.select({
      day: sql<string>`substr(${schema.transactions.createdAt}, 1, 10)`,
    }).from(schema.transactions).all();
    const distinctDays = new Set(rows.map((r) => r.day));
    expect(distinctDays.size).toBeGreaterThanOrEqual(30);
  });

  it('never leaves current_inventory negative', () => {
    const rows = ctx.db.select().from(schema.currentInventory).all();
    for (const r of rows) {
      expect(r.quantity).toBeGreaterThanOrEqual(0);
    }
  });

  it('produces at least one redistribute transaction', () => {
    const rows = ctx.db.select({ c: sql<number>`count(*)` })
      .from(schema.transactions)
      .where(eq(schema.transactions.action, 'redistribute')).all();
    expect(rows[0]?.c ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('reproduces the same transaction count when re-run with the same inputs', () => {
    const before = ctx.db.select({ c: sql<number>`count(*)` })
      .from(schema.transactions).all()[0]!.c;

    // Reset to a clean DB, re-seed reference + dev
    const ctx2 = createTestDb();
    seedReferenceFixtures(ctx2.db);
    seedReferenceProducts(ctx2.db);
    return runDevSeed(ctx2.db, schema, ctx2.sqlite).then(() => {
      const after = ctx2.db.select({ c: sql<number>`count(*)` })
        .from(schema.transactions).all()[0]!.c;
      expect(after).toBe(before);
    });
  });
});

import { existsSync } from 'fs';
import { isNotNull, sql as drizzleSql } from 'drizzle-orm';

describe('runDevSeed — edge fixtures', () => {
  let ctx: ReturnType<typeof createTestDb>;

  beforeAll(async () => {
    ctx = createTestDb();
    seedReferenceFixtures(ctx.db);
    seedReferenceProducts(ctx.db);
    await runDevSeed(ctx.db, schema, ctx.sqlite);
  });

  it('creates a pending inventory count with id dev-pending-count', () => {
    const row = ctx.db.select().from(schema.inventoryCounts)
      .where(eq(schema.inventoryCounts.id, 'dev-pending-count')).all()[0];
    expect(row?.status).toBe('pending');
  });

  it('marks at least one product inactive', () => {
    const inactive = ctx.db.select({ c: drizzleSql<number>`count(*)` })
      .from(schema.products)
      .where(eq(schema.products.isActive, false)).all();
    expect(inactive[0]!.c).toBeGreaterThanOrEqual(1);
  });

  it('marks at least one office inactive', () => {
    const inactive = ctx.db.select({ c: drizzleSql<number>`count(*)` })
      .from(schema.offices)
      .where(eq(schema.offices.isActive, false)).all();
    expect(inactive[0]!.c).toBeGreaterThanOrEqual(1);
  });

  it('creates a transaction with a shipping receipt path that exists on disk', () => {
    const row = ctx.db.select().from(schema.transactions)
      .where(isNotNull(schema.transactions.shippingReceiptPath)).all()[0];
    expect(row?.shippingReceiptPath).toBe('uploads/receipts/dev-sample-receipt.pdf');
    expect(existsSync(row!.shippingReceiptPath!)).toBe(true);
  });

  it('creates a line item with a non-empty other_description', () => {
    const rows = ctx.db.select().from(schema.transactionLineItems)
      .where(isNotNull(schema.transactionLineItems.otherDescription)).all();
    expect(rows.some((r) => (r.otherDescription ?? '').length > 0)).toBe(true);
  });

  it('leaves at least one (office, product) pair with no current_inventory row', () => {
    const officeIds = ctx.db.select({ id: schema.offices.id }).from(schema.offices).all();
    const productIds = ctx.db.select({ id: schema.products.id })
      .from(schema.products).where(eq(schema.products.isOther, false)).all();
    const present = new Set(
      ctx.db.select({
        k: drizzleSql<string>`${schema.currentInventory.officeId} || '::' || ${schema.currentInventory.productId}`,
      }).from(schema.currentInventory).all().map((r) => r.k),
    );
    let missing = 0;
    for (const o of officeIds) for (const p of productIds) {
      if (!present.has(`${o.id}::${p.id}`)) missing++;
    }
    expect(missing).toBeGreaterThanOrEqual(1);
  });
});

describe('runDevSeed — verification', () => {
  it('throws if the pending count fixture is missing post-run', async () => {
    const ctx = createTestDb();
    seedReferenceFixtures(ctx.db);
    seedReferenceProducts(ctx.db);
    await runDevSeed(ctx.db, schema, ctx.sqlite);

    // Delete the pending count, simulating data loss; verify() should fail
    // when called again. We expose verifyDevSeed via the module for testing.
    ctx.db.delete(schema.inventoryCounts)
      .where(eq(schema.inventoryCounts.id, 'dev-pending-count')).run();
    const { verifyDevSeed } = await import('./seed-dev.js');
    expect(() => verifyDevSeed(ctx.db, schema)).toThrow(/dev-pending-count/);
  });
});
