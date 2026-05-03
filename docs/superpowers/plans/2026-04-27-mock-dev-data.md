# Mock Dev Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `db:seed:dev` workflow that layers mock users, ~1500 deterministic transactions, and edge-case fixtures on top of the production seed so a developer can exercise every route by switching `DEV_AUTH_USER_ID`.

**Architecture:** Pure additive layer. New `seed-dev.ts` orchestrator + helpers (`seed-dev-rng.ts`, `seed-dev-bulk.ts`, `seed-dev-pdf.ts`) that read existing reference data, insert dev users with fixed IDs, generate bulk history via the existing `createTransaction()` service (so business rules are enforced), and apply edge-case fixtures. Production `seed.ts` is untouched.

**Tech Stack:** TypeScript, drizzle-orm, better-sqlite3, vitest, tsx.

**Spec:** `docs/superpowers/specs/2026-04-27-mock-dev-data-design.md`

---

## File structure

| File | Responsibility |
|---|---|
| `package.json` | Add `db:seed:dev` and `db:reset:dev` scripts. |
| `src/lib/server/db/seed-dev.ts` | CLI entry + orchestrator (cleanup → users → bulk → fixtures → summary). Exports `runDevSeed()` for tests. |
| `src/lib/server/db/seed-dev-rng.ts` | `mulberry32(seed)` PRNG and helpers (`randInt`, `pick`, `weightedPick`). Pure. |
| `src/lib/server/db/seed-dev-bulk.ts` | `seedBulkHistory(db, schema, opts)` — generates the deterministic transaction history. |
| `src/lib/server/db/seed-dev-pdf.ts` | `writePlaceholderPdf(path)` — writes a tiny valid PDF. |
| `src/lib/server/db/seed-dev-rng.test.ts` | Unit tests for RNG determinism + helpers. |
| `src/lib/server/db/seed-dev.test.ts` | Integration smoke test against in-memory DB. |

---

## Task 1: Add npm scripts and CLI scaffold

**Files:**
- Modify: `package.json`
- Create: `src/lib/server/db/seed-dev.ts`

- [ ] **Step 1: Add scripts to package.json**

In the `"scripts"` block, add (next to the existing `db:*` entries):

```json
"db:seed:dev":  "npx tsx src/lib/server/db/seed-dev.ts",
"db:reset:dev": "rm -f dev.db && rm -rf uploads/receipts/dev-* && npm run db:migrate && npm run db:seed && npm run db:seed:dev"
```

- [ ] **Step 2: Create the CLI scaffold**

Create `src/lib/server/db/seed-dev.ts`:

```ts
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
import * as schema from './schema/sqlite.js';

// Match the loose-typing pattern used in src/lib/server/services/transactions.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;
type SqliteHandle = InstanceType<typeof Database>;

export async function runDevSeed(
  db:     DrizzleDb,
  s:      typeof schema,
  sqlite: SqliteHandle,
): Promise<void> {
  // Tasks 3-7 fill this in.
  void db; void s; void sqlite;
  console.log('🌱 Dev seed: scaffold (no-op)');
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
```

- [ ] **Step 3: Verify the scaffold runs**

Run: `npm run db:reset && npm run db:seed:dev`
Expected output ends with: `🌱 Dev seed: scaffold (no-op)`

- [ ] **Step 4: Commit**

```bash
git add package.json src/lib/server/db/seed-dev.ts
git commit -m "Added scaffold for db:seed:dev"
```

---

## Task 2: Seeded RNG (TDD)

**Files:**
- Create: `src/lib/server/db/seed-dev-rng.ts`
- Create: `src/lib/server/db/seed-dev-rng.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/server/db/seed-dev-rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mulberry32, randInt, pick, weightedPick } from './seed-dev-rng.js';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('returns values in [0, 1)', () => {
    const r = mulberry32(99);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('helpers', () => {
  it('randInt is deterministic and in range', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 50; i++) {
      const v = randInt(r, 1, 10);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('pick returns an element of the array', () => {
    const r = mulberry32(7);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 20; i++) {
      expect(arr).toContain(pick(r, arr));
    }
  });

  it('weightedPick respects weights', () => {
    const r = mulberry32(123);
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 1000; i++) {
      counts[weightedPick(r, [['a', 9], ['b', 1]])]++;
    }
    // ~90/10 split with some slack
    expect(counts.a).toBeGreaterThan(800);
    expect(counts.b).toBeLessThan(200);
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm run test:unit -- --run src/lib/server/db/seed-dev-rng.test.ts`
Expected: FAIL — module `./seed-dev-rng.js` not found.

- [ ] **Step 3: Implement RNG**

Create `src/lib/server/db/seed-dev-rng.ts`:

```ts
/**
 * Seeded PRNG and helpers for deterministic dev seed generation.
 * mulberry32: small, fast, deterministic — suitable for non-cryptographic use.
 */

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let t = seed >>> 0;
  return function (): number {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(r: Rng, min: number, max: number): number {
  return Math.floor(r() * (max - min + 1)) + min;
}

export function pick<T>(r: Rng, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick: empty array');
  return arr[Math.floor(r() * arr.length)]!;
}

export function weightedPick<T extends string>(
  r: Rng,
  weighted: ReadonlyArray<readonly [T, number]>,
): T {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let roll = r() * total;
  for (const [value, weight] of weighted) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return weighted[weighted.length - 1]![0];
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm run test:unit -- --run src/lib/server/db/seed-dev-rng.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/db/seed-dev-rng.ts src/lib/server/db/seed-dev-rng.test.ts
git commit -m "Added seeded RNG for dev seed determinism"
```

---

## Task 3: Cleanup function (idempotency)

**Files:**
- Modify: `src/lib/server/db/seed-dev.ts`

- [ ] **Step 1: Add cleanupDevRows()**

Add this function above `runDevSeed` in `src/lib/server/db/seed-dev.ts`:

```ts
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
```

- [ ] **Step 2: Wire into runDevSeed**

Replace the body of `runDevSeed` with:

```ts
export async function runDevSeed(
  db:     DrizzleDb,
  s:      typeof schema,
  sqlite: SqliteHandle,
): Promise<void> {
  cleanupDevRows(sqlite);
  // Tasks 4-6 add: users, bulk history, edge fixtures, summary.
  void db; void s;
  console.log('🌱 Dev seed: cleanup complete');
}
```

- [ ] **Step 3: Verify it can be re-run**

Run: `npm run db:reset && npm run db:seed:dev && npm run db:seed:dev`
Expected: both invocations succeed, ending with `🌱 Dev seed: cleanup complete`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/db/seed-dev.ts
git commit -m "Added idempotent cleanup of dev-seed rows"
```

---

## Task 4: Dev users (TDD)

**Files:**
- Modify: `src/lib/server/db/seed-dev.ts`
- Create: `src/lib/server/db/seed-dev.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/lib/server/db/seed-dev.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm run test:unit -- --run src/lib/server/db/seed-dev.test.ts`
Expected: FAIL — `users.toHaveLength(6)` returns 0 (no users inserted).

- [ ] **Step 3: Implement seedDevUsers**

Add to `src/lib/server/db/seed-dev.ts` (above `runDevSeed`):

```ts
import { eq } from 'drizzle-orm';

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
```

- [ ] **Step 4: Wire into runDevSeed**

Replace `runDevSeed`:

```ts
export async function runDevSeed(
  db:     DrizzleDb,
  s:      typeof schema,
  sqlite: SqliteHandle,
): Promise<void> {
  cleanupDevRows(sqlite);
  const users = seedDevUsers(db, s);
  console.log(`🌱 Dev seed: ${users.length} dev users`);
  // Tasks 5-6: bulk history + edge fixtures.
}
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `npm run test:unit -- --run src/lib/server/db/seed-dev.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 6: End-to-end smoke**

Run: `npm run db:reset && npm run db:seed:dev`
Expected: `🌱 Dev seed: 6 dev users`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/db/seed-dev.ts src/lib/server/db/seed-dev.test.ts
git commit -m "Added dev users with fixed IDs covering all 6 roles"
```

---

## Task 5: Bulk transaction generator (TDD)

**Files:**
- Create: `src/lib/server/db/seed-dev-bulk.ts`
- Modify: `src/lib/server/db/seed-dev.ts`
- Modify: `src/lib/server/db/seed-dev.test.ts`

- [ ] **Step 1: Extend the test with bulk-history assertions**

Once bulk is wired into `runDevSeed` (Step 4), every test that calls `runDevSeed` needs reference products too — otherwise bulk gen has no products to choose from and fails. Update the existing `runDevSeed — dev users` block in `seed-dev.test.ts` to also call `seedReferenceProducts(ctx.db)` in its `beforeAll`, immediately after `seedReferenceFixtures(ctx.db)`. (`seedReferenceProducts` is defined in the next code block below.)

Append to `src/lib/server/db/seed-dev.test.ts`:

```ts
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
```

- [ ] **Step 2: Run, confirm failure**

Run: `npm run test:unit -- --run src/lib/server/db/seed-dev.test.ts`
Expected: FAIL — bulk assertions fail (0 transactions, 0 days, etc.).

- [ ] **Step 3: Implement bulk generator**

Create `src/lib/server/db/seed-dev-bulk.ts`:

```ts
import { eq } from 'drizzle-orm';
import * as schema from './schema/sqlite.js';
import { createTransaction } from '$lib/server/services/transactions.js';
import type { SessionUser, InventoryAction } from '$lib/types.js';
import { mulberry32, randInt, pick, weightedPick, type Rng } from './seed-dev-rng.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export interface BulkSeedOptions {
  rng:                Rng;
  /** Days back from `endDate` to start generating. */
  spanDays:           number;
  endDate:            Date;
  /** Min/max transactions per day (inclusive). */
  txPerDayMin:        number;
  txPerDayMax:        number;
  /** Action probability weights. Order: receive, return, remove, redistribute. */
  actionWeights:      ReadonlyArray<readonly [InventoryAction, number]>;
  /** Map of officeId → list of productIds eligible for that office. */
  officeProducts:     ReadonlyMap<string, readonly string[]>;
  /** Users available to record transactions; filtered by scope per-office. */
  users:              ReadonlyArray<SessionUser>;
  /**
   * Per office, returns the set of users whose scope contains it.
   * Computed by the caller using `getOfficeIdsForUser` so the bulk
   * generator stays free of scope concerns.
   */
  recordersForOffice: (officeId: string) => SessionUser[];
}

export async function seedBulkHistory(
  db:    DrizzleDb,
  s:     typeof schema,
  opts:  BulkSeedOptions,
): Promise<{ transactionCount: number; redistributeCount: number }> {
  const { rng, spanDays, endDate, txPerDayMin, txPerDayMax,
          actionWeights, officeProducts, recordersForOffice } = opts;

  const officeIds = [...officeProducts.keys()];
  // In-memory tally of (officeId, productId) → quantity, used to skip
  // remove/redistribute that would underflow without round-tripping the DB.
  const onHand = new Map<string, number>();
  const key = (o: string, p: string) => `${o}::${p}`;

  let transactionCount = 0;
  let redistributeCount = 0;

  for (let dayOffset = spanDays; dayOffset >= 0; dayOffset--) {
    const day = new Date(endDate);
    day.setDate(day.getDate() - dayOffset);
    const txCount = randInt(rng, txPerDayMin, txPerDayMax);

    for (let i = 0; i < txCount; i++) {
      const officeId = pick(rng, officeIds);
      const eligible = officeProducts.get(officeId)!;
      const recorders = recordersForOffice(officeId);
      if (recorders.length === 0) continue;
      const recorder = pick(rng, recorders);

      const action = weightedPick(rng, actionWeights);
      const lineCount = randInt(rng, 1, Math.min(4, eligible.length));
      const lineProducts = pickN(rng, eligible, lineCount);
      let lineItems = lineProducts.map((productId) => {
        const max = action === 'remove' || action === 'redistribute'
          ? Math.min(50, onHand.get(key(officeId, productId)) ?? 0)
          : randInt(rng, 1, 50);
        return { productId, quantity: max <= 0 ? 0 : randInt(rng, 1, max) };
      }).filter((li) => li.quantity > 0);

      if (lineItems.length === 0) continue; // nothing to do (no stock to remove)

      let destinationOfficeId: string | undefined;
      if (action === 'redistribute') {
        const others = officeIds.filter((o) => o !== officeId);
        if (others.length === 0) continue;
        destinationOfficeId = pick(rng, others);

        // Respect the destination's allowlist so excluded (office, product)
        // pairs never receive a current_inventory row via redistribute either.
        const destEligible = new Set(officeProducts.get(destinationOfficeId) ?? []);
        lineItems = lineItems.filter((li) => destEligible.has(li.productId));
        if (lineItems.length === 0) continue;
      }

      let transactionId: string;
      try {
        const result = await createTransaction(db, s, recorder, {
          action, officeId, performedByUserId: recorder.id,
          lineItems, notes: undefined, destinationOfficeId,
        });
        transactionId = result.transactionId;
      } catch {
        // Insufficient inventory or scope mismatch — skip and continue.
        continue;
      }

      // Update local tally to reflect the (now-applied) transaction.
      for (const li of lineItems) {
        const k = key(officeId, li.productId);
        const delta = action === 'receive' || action === 'return'
          ?  li.quantity
          : -li.quantity;
        onHand.set(k, (onHand.get(k) ?? 0) + delta);
        if (action === 'redistribute' && destinationOfficeId) {
          const dk = key(destinationOfficeId, li.productId);
          onHand.set(dk, (onHand.get(dk) ?? 0) + li.quantity);
        }
      }
      transactionCount++;
      if (action === 'redistribute') redistributeCount++;

      // Backdate the transaction so it lands on the synthetic day.
      // createTransaction stamps "now" — update by id to a deterministic time.
      const stamp = new Date(day);
      stamp.setUTCHours(randInt(rng, 8, 17), randInt(rng, 0, 59), 0, 0);
      db.update(s.transactions)
        .set({ createdAt: stamp.toISOString() })
        .where(eq(s.transactions.id, transactionId))
        .run();
    }
  }

  // Force at least one redistribute if the random walk never produced one.
  if (redistributeCount === 0 && officeIds.length >= 2) {
    const src = officeIds[0]!;
    const dst = officeIds[1]!;
    const product = pick(rng, [...officeProducts.get(src)!]);
    // Ensure source has stock first
    const recorder = recordersForOffice(src).find((u) => u.role !== 'ci_specialist')
                  ?? recordersForOffice(src)[0]!;
    await createTransaction(db, s, recorder, {
      action: 'receive', officeId: src,
      performedByUserId: recorder.id,
      lineItems: [{ productId: product, quantity: 10 }],
    });
    await createTransaction(db, s, recorder, {
      action: 'redistribute', officeId: src, destinationOfficeId: dst,
      performedByUserId: recorder.id,
      lineItems: [{ productId: product, quantity: 5 }],
    });
    transactionCount += 2;
    redistributeCount++;
  }

  return { transactionCount, redistributeCount };
}

/** Pick n distinct elements from arr without replacement. */
function pickN<T>(r: Rng, arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(r() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}

export const DEFAULT_ACTION_WEIGHTS: ReadonlyArray<readonly [InventoryAction, number]> = [
  ['receive',      45],
  ['remove',       30],
  ['return',       15],
  ['redistribute', 10],
];

/** Seed used to initialize the bulk-gen PRNG. Callers construct a fresh
 *  `mulberry32(BULK_SEED_VALUE)` per invocation so re-running produces
 *  identical state (singleton RNG would consume state across calls). */
export const BULK_SEED_VALUE = 0x5EED_DE7;
```

- [ ] **Step 4: Wire bulk into runDevSeed**

In `src/lib/server/db/seed-dev.ts`, add helpers and call the generator:

```ts
import { inArray } from 'drizzle-orm';
import { ROLE_SCOPE_MAP } from '$lib/types.js';
import { seedBulkHistory, DEFAULT_ACTION_WEIGHTS, BULK_SEED_VALUE } from './seed-dev-bulk.js';
import { mulberry32 } from './seed-dev-rng.js';
import type { SessionUser } from '$lib/types.js';

const ZERO_INV_PRODUCT_SLUG = 'vanilla';
const ZERO_INV_OFFICE_NUMBER = '129'; // Duncan

/** Build officeId → productIds[] excluding (zero-inv office, zero-inv product). */
function buildOfficeProductMap(
  db: DrizzleDb, s: typeof schema, officeIds: string[],
): Map<string, string[]> {
  const allProducts = db.select({ id: s.products.id, slug: s.products.slug, isOther: s.products.isOther })
    .from(s.products)
    .where(eq(s.products.isActive, true))
    .all();
  const regularProductIds = allProducts.filter((p) => !p.isOther).map((p) => p.id);
  const zeroProduct = allProducts.find((p) => p.slug === ZERO_INV_PRODUCT_SLUG);

  const offices = db.select({ id: s.offices.id, num: s.offices.officeNumber })
    .from(s.offices)
    .where(inArray(s.offices.id, officeIds)).all();
  const zeroOffice = offices.find((o) => o.num === ZERO_INV_OFFICE_NUMBER);

  const map = new Map<string, string[]>();
  for (const o of offices) {
    if (o.id === zeroOffice?.id && zeroProduct) {
      map.set(o.id, regularProductIds.filter((id) => id !== zeroProduct.id));
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
    .all().map((r) => r.id);
  const others = db.select({ id: s.offices.id })
    .from(s.offices)
    .innerJoin(s.regions, eq(s.regions.id, s.offices.regionId))
    .where(sql`${s.regions.slug} != 'island'`)
    .limit(5).all().map((r) => r.id);
  return [...island, ...others];
}
```

(The `sql` import is from `drizzle-orm`; add it if not already imported.)

Replace `runDevSeed` body with:

```ts
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
}
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `npm run test:unit -- --run src/lib/server/db/seed-dev.test.ts`
Expected: PASS — bulk-history block green.

- [ ] **Step 6: End-to-end smoke**

Run: `npm run db:reset:dev`
Expected: ends with `🌱 Dev seed: 6 users, ~1500 transactions ...`. Wall-clock < 30s.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/db/seed-dev-bulk.ts src/lib/server/db/seed-dev.ts src/lib/server/db/seed-dev.test.ts
git commit -m "Added bulk transaction generator with seeded RNG"
```

---

## Task 6: Edge-case fixtures (TDD)

**Files:**
- Create: `src/lib/server/db/seed-dev-pdf.ts`
- Modify: `src/lib/server/db/seed-dev.ts`
- Modify: `src/lib/server/db/seed-dev.test.ts`

- [ ] **Step 1: Implement minimal PDF writer (no test — pure file IO)**

Create `src/lib/server/db/seed-dev-pdf.ts`:

```ts
import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

/**
 * Minimal valid 1-page PDF (~700 bytes). Renders blank in any PDF viewer.
 * Avoids checking a binary into the repo.
 */
const MINIMAL_PDF =
  '%PDF-1.4\n' +
  '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<<>>>>endobj\n' +
  '4 0 obj<</Length 44>>stream\n' +
  'BT /F1 12 Tf 100 700 Td (Dev sample receipt) Tj ET\n' +
  'endstream endobj\n' +
  'xref\n0 5\n' +
  '0000000000 65535 f \n' +
  '0000000009 00000 n \n' +
  '0000000052 00000 n \n' +
  '0000000095 00000 n \n' +
  '0000000178 00000 n \n' +
  'trailer<</Size 5/Root 1 0 R>>\n' +
  'startxref\n267\n%%EOF';

export function writePlaceholderPdf(path: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, MINIMAL_PDF, 'utf8');
}
```

- [ ] **Step 2: Extend the test with edge-fixture assertions**

Append to `src/lib/server/db/seed-dev.test.ts`:

```ts
import { existsSync } from 'fs';
import { isNotNull, isNull, ne, sql as drizzleSql } from 'drizzle-orm';

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
```

- [ ] **Step 3: Run, confirm failure**

Run: `npm run test:unit -- --run src/lib/server/db/seed-dev.test.ts`
Expected: FAIL on the new edge-fixture assertions.

- [ ] **Step 4: Implement edge-fixture seeding**

In `src/lib/server/db/seed-dev.ts`, add:

```ts
import { randomUUID } from 'crypto';
import { writePlaceholderPdf } from './seed-dev-pdf.js';

const RECEIPT_PATH = 'uploads/receipts/dev-sample-receipt.pdf';

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
```

(Remember to import `createTransaction` from `$lib/server/services/transactions.js` and `randomUUID` from `crypto` if not already imported.)

- [ ] **Step 5: Wire into runDevSeed**

Add a call after the bulk seed:

```ts
  await seedEdgeFixtures(db, s, sessionUsers);
  console.log(`🌱 Dev seed: edge fixtures applied`);
```

- [ ] **Step 6: Run tests, confirm pass**

Run: `npm run test:unit -- --run src/lib/server/db/seed-dev.test.ts`
Expected: PASS — all edge-fixture tests green.

- [ ] **Step 7: End-to-end smoke**

Run: `npm run db:reset:dev`
Expected: completes; `uploads/receipts/dev-sample-receipt.pdf` exists.

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/db/seed-dev-pdf.ts src/lib/server/db/seed-dev.ts src/lib/server/db/seed-dev.test.ts
git commit -m "Added edge-case fixtures (pending count, inactive flips, receipt, other-item)"
```

---

## Task 7: Verification block + summary print

**Files:**
- Modify: `src/lib/server/db/seed-dev.ts`
- Modify: `src/lib/server/db/seed-dev.test.ts`

- [ ] **Step 1: Add a test asserting the orchestrator throws on a missing fixture**

Append to `seed-dev.test.ts`:

```ts
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
```

- [ ] **Step 2: Run, confirm failure**

Run: `npm run test:unit -- --run src/lib/server/db/seed-dev.test.ts`
Expected: FAIL — `verifyDevSeed` not exported.

- [ ] **Step 3: Implement verification**

Add to `src/lib/server/db/seed-dev.ts`:

```ts
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
```

(Add `import { existsSync } from 'fs';` and `import { isNotNull } from 'drizzle-orm';` to the top of the file.)

- [ ] **Step 4: Wire into runDevSeed and pretty-print summary**

Replace the trailing `console.log` block in `runDevSeed` with:

```ts
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
```

- [ ] **Step 5: Run tests, confirm pass**

Run: `npm run test:unit -- --run src/lib/server/db/seed-dev`
Expected: PASS — all `seed-dev*.test.ts` files green.

- [ ] **Step 6: End-to-end smoke**

Run: `npm run db:reset:dev`
Expected: ends with the multi-line `✅ Dev seed complete` summary.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/db/seed-dev.ts src/lib/server/db/seed-dev.test.ts
git commit -m "Added verification + summary print to dev seed"
```

---

## Task 8: Manual route-coverage walkthrough

**Files:** none (manual verification only).

- [ ] **Step 1: Reset the dev DB**

Run: `npm run db:reset:dev`
Expected: ends with `✅ Dev seed complete`.

- [ ] **Step 2: Walk the route-coverage matrix**

For each row in the spec's route-coverage matrix:

1. Edit `.env`, set `DEV_AUTH_USER_ID=<user from matrix>`.
2. Run `npm run dev`.
3. Visit the route in a browser.
4. Confirm the page renders without errors and shows the expected fixture.

If anything fails, return to Phase 1 of the systematic-debugging skill — do not patch around it.

- [ ] **Step 3: Final commit (only if doc edits were needed)**

If the walkthrough surfaced a doc/typo fix, commit it:

```bash
git add <files>
git commit -m "Fixed minor issues found in mock-data walkthrough"
```

Otherwise, the implementation is complete.

---

## Self-review checklist

After implementing, verify against the spec:

- [ ] 6 dev users at fixed IDs, one per role — Task 4
- [ ] 180-day span, ≥1000 transactions, deterministic via seeded RNG — Task 5
- [ ] Action mix ~45/30/15/10 (receive/remove/return/redistribute) — Task 5 (actionWeights)
- [ ] No negative inventory — Task 5 (onHand guard + smoke test)
- [ ] Pending count at fixed id `dev-pending-count` — Task 6
- [ ] Inactive product, inactive office — Task 6
- [ ] Zero-inventory pair (Duncan × Vanilla) — Task 5 (allowlist exclusion)
- [ ] Receipt-attached transaction with PDF on disk — Task 6
- [ ] "Other" free-text line item — Task 6
- [ ] At least one redistribute (forced fallback) — Task 5
- [ ] `db:reset:dev` and `db:seed:dev` scripts — Task 1
- [ ] Idempotent (re-runnable without reset) — Task 3
- [ ] Production seed unchanged — never modified
- [ ] E2E `e2e-*` users untouched — cleanup uses `dev-*` prefix only
