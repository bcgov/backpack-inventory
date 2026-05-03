/**
 * Dev seed — layers mock users, transaction history, and edge-case fixtures
 * on top of the production reference seed.
 *
 * Run with:
 *   npx tsx src/lib/server/db/seed-dev.ts
 *
 * Idempotent: deletes any rows whose id starts with `dev-` before inserting,
 * and wipes `current_inventory` (derived state) before bulk gen rebuilds it.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq, inArray, isNotNull, sql, sql as drizzleSql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import * as schema from './schema/sqlite.js';
import { ROLE_SCOPE_MAP } from '$lib/types.js';
import { seedBulkHistory, DEFAULT_ACTION_WEIGHTS, BULK_SEED_VALUE } from './seed-dev-bulk.js';
import { mulberry32 } from './seed-dev-rng.js';
import { writePlaceholderPdf } from './seed-dev-pdf.js';
import { createTransaction } from '$lib/server/services/transactions.js';
import type { SessionUser } from '$lib/types.js';

const RECEIPT_PATH = 'uploads/receipts/dev-sample-receipt.pdf';

const ZERO_INV_PRODUCT_SLUG = 'vanilla';
const ZERO_INV_OFFICE_NUMBER = '129'; // Duncan

// Match the loose-typing pattern used in src/lib/server/services/transactions.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;
type SqliteHandle = InstanceType<typeof Database>;

interface DevUser {
  id:     string;
  name:   string;
  email:  string;
  role:   'ci_specialist' | 'supervisor' | 'assistant_supervisor'
        | 'aaa' | 'manager' | 'director_3p';
  teamId:   string | null;
  regionId: string | null;
}

function buildDevUsers(islandRegionId: string, viCentralNorthTeamId: string): DevUser[] {
  return [
    { id: 'dev-ci',         name: 'Dev CI Specialist',         email: 'dev-ci@local.test',
      role: 'ci_specialist',         teamId: viCentralNorthTeamId, regionId: islandRegionId },
    { id: 'dev-supervisor', name: 'Dev Supervisor',            email: 'dev-supervisor@local.test',
      role: 'supervisor',            teamId: viCentralNorthTeamId, regionId: islandRegionId },
    { id: 'dev-asst-sup',   name: 'Dev Assistant Supervisor',  email: 'dev-asst-sup@local.test',
      role: 'assistant_supervisor',  teamId: viCentralNorthTeamId, regionId: islandRegionId },
    { id: 'dev-aaa',        name: 'Dev AAA',                   email: 'dev-aaa@local.test',
      role: 'aaa',                   teamId: null, regionId: islandRegionId },
    { id: 'dev-manager',    name: 'Dev Manager',               email: 'dev-manager@local.test',
      role: 'manager',               teamId: null, regionId: islandRegionId },
    { id: 'dev-director',   name: 'Dev Director',              email: 'dev-director@local.test',
      role: 'director_3p',           teamId: null, regionId: null },
  ];
}

function seedDevUsers(db: DrizzleDb, s: typeof schema): DevUser[] {
  const island = db.select({ id: s.regions.id })
    .from(s.regions).where(eq(s.regions.slug, 'island')).all()[0];
  if (!island) throw new Error('Reference seed missing: Island region');

  const viCentralNorth = db.select({ id: s.teams.id })
    .from(s.teams).where(eq(s.teams.slug, 'vi_central_north')).all()[0];
  if (!viCentralNorth) throw new Error('Reference seed missing: VI Central North team');

  const users = buildDevUsers(island.id, viCentralNorth.id);
  const now = new Date().toISOString();
  for (const u of users) {
    db.insert(s.users).values({
      id: u.id, name: u.name, email: u.email, role: u.role,
      teamId: u.teamId, regionId: u.regionId,
      isActive: true, createdAt: now, updatedAt: now,
    }).run();
  }
  return users;
}

/**
 * Wipe everything the dev seed previously inserted, plus current_inventory
 * (derived state, rebuilt from bulk history). FK-safe: temporarily disables
 * foreign-key checks because some dev rows are referenced by transactions
 * whose ids don't start with `dev-` (we still want all of them gone).
 */
function cleanupDevRows(sqlite: SqliteHandle): void {
  sqlite.pragma('foreign_keys = OFF');
  try {
    sqlite.exec(`
      DELETE FROM transaction_line_items
      WHERE transaction_id IN (
        SELECT id FROM transactions
        WHERE id LIKE 'dev-%' OR recorded_by_user_id LIKE 'dev-%'
      );

      DELETE FROM redistribution_details
      WHERE transaction_id IN (
        SELECT id FROM transactions
        WHERE id LIKE 'dev-%' OR recorded_by_user_id LIKE 'dev-%'
      );

      DELETE FROM inventory_counts
      WHERE id LIKE 'dev-%' OR transaction_id IN (
        SELECT id FROM transactions
        WHERE id LIKE 'dev-%' OR recorded_by_user_id LIKE 'dev-%'
      );

      DELETE FROM transactions
      WHERE id LIKE 'dev-%' OR recorded_by_user_id LIKE 'dev-%';

      DELETE FROM users WHERE id LIKE 'dev-%';

      DELETE FROM current_inventory;

      -- Reset any is_active flips so re-runs are idempotent.
      UPDATE products  SET is_active = 1 WHERE is_active = 0;
      UPDATE offices   SET is_active = 1 WHERE is_active = 0;
    `);
  } finally {
    sqlite.pragma('foreign_keys = ON');
  }
}

/** Build officeId → productIds[] excluding (zero-inv office, zero-inv product). */
function buildOfficeProductMap(
  db: DrizzleDb, s: typeof schema, officeIds: string[],
): Map<string, string[]> {
  const allProducts = db.select({ id: s.products.id, slug: s.products.slug, isOther: s.products.isOther })
    .from(s.products)
    .where(eq(s.products.isActive, true))
    .all();
  const regularProductIds = allProducts.filter((p: { isOther: boolean }) => !p.isOther).map((p: { id: string }) => p.id);
  const zeroProduct = allProducts.find((p: { slug: string }) => p.slug === ZERO_INV_PRODUCT_SLUG);

  const offices = db.select({ id: s.offices.id, num: s.offices.officeNumber })
    .from(s.offices)
    .where(inArray(s.offices.id, officeIds)).all();
  const zeroOffice = offices.find((o: { num: string }) => o.num === ZERO_INV_OFFICE_NUMBER);

  const map = new Map<string, string[]>();
  for (const o of offices) {
    if (o.id === zeroOffice?.id && zeroProduct) {
      map.set(o.id, regularProductIds.filter((id: string) => id !== zeroProduct.id));
    } else {
      map.set(o.id, regularProductIds);
    }
  }
  return map;
}

function asSessionUser(u: { id: string; name: string; email: string;
                           role: SessionUser['role']; teamId: string | null;
                           regionId: string | null }): SessionUser {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    teamId: u.teamId, regionId: u.regionId,
  };
}

/** Subset of offices the bulk generator uses (Island team + 4-5 across other regions). */
function pickBulkOffices(db: DrizzleDb, s: typeof schema): string[] {
  const island = db.select({ id: s.offices.id })
    .from(s.offices)
    .innerJoin(s.regions, eq(s.regions.id, s.offices.regionId))
    .where(eq(s.regions.slug, 'island'))
    .all().map((r: { id: string }) => r.id);
  const others = db.select({ id: s.offices.id })
    .from(s.offices)
    .innerJoin(s.regions, eq(s.regions.id, s.offices.regionId))
    .where(sql`${s.regions.slug} != 'island'`)
    .limit(5).all().map((r: { id: string }) => r.id);
  return [...island, ...others];
}

async function seedEdgeFixtures(
  db: DrizzleDb, s: typeof schema, sessionUsers: SessionUser[],
): Promise<void> {
  const supervisor = sessionUsers.find((u) => u.id === 'dev-supervisor')!;
  const ci         = sessionUsers.find((u) => u.id === 'dev-ci')!;

  // Pick a known Island office + product for fixtures.
  const office = db.select({ id: s.offices.id }).from(s.offices)
    .where(eq(s.offices.officeNumber, '132')).all()[0]!; // Nanaimo
  const apple  = db.select({ id: s.products.id }).from(s.products)
    .where(eq(s.products.slug, 'apple')).all()[0]!;
  const otherCereal = db.select({ id: s.products.id }).from(s.products)
    .where(eq(s.products.isOther, true)).all()[0]!;

  // ── 1) Pending inventory count with variance ─────────────────────────────
  // Insert the underlying transaction + line items + inventory_counts row directly
  // so the inventory_counts.id is fixed (`dev-pending-count`).
  const pendingTxId = 'dev-pending-count-tx';
  const now = new Date().toISOString();

  // Find a product that office has stock of, count an off-by-N quantity to create variance.
  const stockRow = db.select().from(s.currentInventory)
    .where(eq(s.currentInventory.officeId, office.id)).limit(1).all()[0];
  const countedProductId = stockRow?.productId ?? apple.id;
  const countedQty = (stockRow?.quantity ?? 0) + 7; // +7 ⇒ guaranteed variance

  db.insert(s.transactions).values({
    id: pendingTxId,
    confirmationId:    'DEVCOUNT',
    action:            'inventory_count',
    officeId:          office.id,
    performedByUserId: supervisor.id,
    recordedByUserId:  supervisor.id,
    notes:             'Dev fixture: pending count with variance',
    createdAt:         now,
  }).run();
  db.insert(s.transactionLineItems).values({
    id:           randomUUID(),
    transactionId: pendingTxId,
    productId:    countedProductId,
    quantity:     countedQty,
  }).run();
  db.insert(s.inventoryCounts).values({
    id:            'dev-pending-count',
    transactionId: pendingTxId,
    status:        'pending',
  }).run();

  // ── 2) Inactive product ──────────────────────────────────────────────────
  db.update(s.products).set({ isActive: false })
    .where(eq(s.products.slug, 'spoons')).run();
  // Also try a fallback (test fixture doesn't include spoons): pick any non-Other
  // product and flip it if no spoons row exists.
  const flippedCount = db.select({ c: drizzleSql<number>`count(*)` })
    .from(s.products).where(eq(s.products.isActive, false)).all()[0]!.c;
  if (flippedCount === 0) {
    const any = db.select({ id: s.products.id }).from(s.products)
      .where(eq(s.products.isOther, false)).limit(1).all()[0];
    if (any) db.update(s.products).set({ isActive: false })
      .where(eq(s.products.id, any.id)).run();
  }

  // ── 3) Inactive office (non-Island) ──────────────────────────────────────
  const nonIsland = db.select({ id: s.offices.id }).from(s.offices)
    .innerJoin(s.regions, eq(s.regions.id, s.offices.regionId))
    .where(drizzleSql`${s.regions.slug} != 'island'`)
    .limit(1).all()[0];
  if (nonIsland) {
    db.update(s.offices).set({ isActive: false })
      .where(eq(s.offices.id, nonIsland.id)).run();
  }

  // ── 4) Receipt-attached transaction ──────────────────────────────────────
  writePlaceholderPdf(RECEIPT_PATH);
  await createTransaction(db, s, supervisor, {
    action:              'receive',
    officeId:            office.id,
    performedByUserId:   supervisor.id,
    lineItems:           [{ productId: apple.id, quantity: 12 }],
    notes:               'Dev fixture: receive with shipping receipt',
    shippingReceiptPath: RECEIPT_PATH,
  });

  // ── 5) "Other" free-text line item ───────────────────────────────────────
  await createTransaction(db, s, ci, {
    action:            'receive',
    officeId:          office.id,
    performedByUserId: ci.id,
    lineItems:         [{
      productId: otherCereal.id, quantity: 4,
      otherDescription: 'Custom granola bars (sample)',
    }],
    notes: 'Dev fixture: other-item',
  });
}

export function verifyDevSeed(db: DrizzleDb, s: typeof schema): {
  users: number; transactions: number; redistributes: number;
  pendingCount: boolean; inactiveProduct: boolean; inactiveOffice: boolean;
  receiptOnDisk: boolean; otherItem: boolean;
} {
  const users = db.select({ c: drizzleSql<number>`count(*)` }).from(s.users)
    .where(drizzleSql`${s.users.id} LIKE 'dev-%'`).all()[0]!.c;
  if (users !== 6) throw new Error(`Expected 6 dev users, found ${users}`);

  const transactions = db.select({ c: drizzleSql<number>`count(*)` })
    .from(s.transactions).all()[0]!.c;

  const redistributes = db.select({ c: drizzleSql<number>`count(*)` })
    .from(s.transactions).where(eq(s.transactions.action, 'redistribute')).all()[0]!.c;
  if (redistributes < 1) throw new Error('No redistribute transaction present');

  const pending = db.select().from(s.inventoryCounts)
    .where(eq(s.inventoryCounts.id, 'dev-pending-count')).all()[0];
  if (!pending) throw new Error('Missing fixture: dev-pending-count');

  const inactiveProduct = db.select({ c: drizzleSql<number>`count(*)` })
    .from(s.products).where(eq(s.products.isActive, false)).all()[0]!.c >= 1;
  if (!inactiveProduct) throw new Error('Missing fixture: inactive product');

  const inactiveOffice = db.select({ c: drizzleSql<number>`count(*)` })
    .from(s.offices).where(eq(s.offices.isActive, false)).all()[0]!.c >= 1;
  if (!inactiveOffice) throw new Error('Missing fixture: inactive office');

  const receiptRow = db.select().from(s.transactions)
    .where(isNotNull(s.transactions.shippingReceiptPath)).all()[0];
  if (!receiptRow) throw new Error('Missing fixture: receipt-attached transaction');
  const receiptOnDisk = !!receiptRow.shippingReceiptPath
    && (function () { try { return existsSync(receiptRow.shippingReceiptPath!); } catch { return false; } })();
  if (!receiptOnDisk) throw new Error(`Missing receipt file: ${receiptRow.shippingReceiptPath}`);

  const otherItem = db.select({ c: drizzleSql<number>`count(*)` })
    .from(s.transactionLineItems)
    .where(isNotNull(s.transactionLineItems.otherDescription)).all()[0]!.c >= 1;
  if (!otherItem) throw new Error('Missing fixture: other-description line item');

  return { users, transactions, redistributes,
           pendingCount: true, inactiveProduct, inactiveOffice,
           receiptOnDisk, otherItem };
}

export async function runDevSeed(
  db:     DrizzleDb,
  s:      typeof schema,
  sqlite: SqliteHandle,
): Promise<void> {
  cleanupDevRows(sqlite);
  const users = seedDevUsers(db, s);
  const sessionUsers = users.map(asSessionUser);

  const officeIds = pickBulkOffices(db, s);
  const officeProducts = buildOfficeProductMap(db, s, officeIds);

  // Compute scope membership once, in JS.
  const teamOfficeIds = new Map<string, Set<string>>();
  const regionOfficeIds = new Map<string, Set<string>>();
  for (const o of db.select({ id: s.offices.id, teamId: s.offices.teamId, regionId: s.offices.regionId })
                    .from(s.offices).all()) {
    if (o.teamId) {
      if (!teamOfficeIds.has(o.teamId)) teamOfficeIds.set(o.teamId, new Set());
      teamOfficeIds.get(o.teamId)!.add(o.id);
    }
    if (!regionOfficeIds.has(o.regionId)) regionOfficeIds.set(o.regionId, new Set());
    regionOfficeIds.get(o.regionId)!.add(o.id);
  }
  const recordersForOffice = (officeId: string): SessionUser[] => sessionUsers.filter((u) => {
    const scope = ROLE_SCOPE_MAP[u.role];
    if (scope === 'all') return true;
    if (scope === 'region' && u.regionId) return regionOfficeIds.get(u.regionId)?.has(officeId) ?? false;
    if (scope === 'team'   && u.teamId)   return teamOfficeIds.get(u.teamId)?.has(officeId)     ?? false;
    return false;
  });

  const bulk = await seedBulkHistory(db, s, {
    rng:                mulberry32(BULK_SEED_VALUE),
    spanDays:           180,
    endDate:            new Date(),
    txPerDayMin:        8,
    txPerDayMax:        15,
    actionWeights:      DEFAULT_ACTION_WEIGHTS,
    officeProducts,
    users:              sessionUsers,
    recordersForOffice,
  });

  console.log(`🌱 Dev seed: ${users.length} users, ${bulk.transactionCount} transactions ` +
              `(${bulk.redistributeCount} redistribute)`);

  await seedEdgeFixtures(db, s, sessionUsers);
  const v = verifyDevSeed(db, s);

  console.log('');
  console.log('✅ Dev seed complete');
  console.log(`   • ${v.users} users (1 per role)`);
  console.log(`   • ${v.transactions} transactions ` +
              `(${v.redistributes} redistribute) across ${officeIds.length} offices`);
  console.log(`   • Pending count: /reconcile/dev-pending-count`);
  console.log(`   • Edge fixtures: inactive-product ✓ inactive-office ✓ ` +
              `receipt ✓ other-item ✓`);
}

// ── CLI entry ────────────────────────────────────────────────────────────────
async function main() {
  const dbPath = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

  await runDevSeed(db, schema, sqlite);
  sqlite.close();
}

// Run if invoked directly via tsx
const invokedDirectly =
  typeof process !== 'undefined' &&
  process.argv[1]?.endsWith('seed-dev.ts');
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
