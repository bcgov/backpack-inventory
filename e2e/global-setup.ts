/**
 * e2e/global-setup.ts
 *
 * Runs once before all Playwright tests.
 * Resets the dev DB and seeds test users at known IDs so Playwright can
 * inject them via the x-test-user-id bypass header.
 *
 * Also seeds a deterministic region/team/office/product chain used by
 * QR-scan E2E tests.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../src/lib/server/db/schema/sqlite.js';

export const TEST_USERS = {
  supervisor: {
    id:       'e2e-supervisor',
    name:     'E2E Supervisor',
    email:    'e2e-supervisor@test.local',
    role:     'supervisor' as const,
    teamId:   null as string | null,
    regionId: null as string | null,
  },
  ci_specialist: {
    id:       'e2e-ci',
    name:     'E2E CI Specialist',
    email:    'e2e-ci@test.local',
    role:     'ci_specialist' as const,
    teamId:   null as string | null,
    regionId: null as string | null,
  },
};

/** Deterministic IDs for QR-scan E2E fixtures */
export const TEST_FIXTURES = {
  regionId:   'region-test',
  teamId:     'team-test',
  officeId:   'office-test',
  categoryId: 'cat-test',
  productId:  'prod-test',
};

export default async function globalSetup() {
  const dbPath = (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

  // Ensure migrations are applied
  migrate(db, { migrationsFolder: 'src/lib/server/db/migrations/sqlite' });

  // Remove any leftover E2E users from a previous run.
  // Disable FK checks temporarily so child rows (transactions, audit log, etc.)
  // don't block deletion of the test user rows.
  sqlite.pragma('foreign_keys = OFF');
  sqlite.prepare(`DELETE FROM users WHERE email LIKE 'e2e-%@test.local'`).run();
  sqlite.pragma('foreign_keys = ON');

  const now = new Date().toISOString();

  // Seed deterministic region → team → office chain for QR tests
  sqlite.prepare(`
    INSERT OR IGNORE INTO regions (id, name, slug, created_at)
    VALUES (?, 'Test Region', ?, ?)
  `).run(TEST_FIXTURES.regionId, TEST_FIXTURES.regionId, now);

  sqlite.prepare(`
    INSERT OR IGNORE INTO teams (id, region_id, name, slug, created_at)
    VALUES (?, ?, 'Test Team', ?, ?)
  `).run(TEST_FIXTURES.teamId, TEST_FIXTURES.regionId, TEST_FIXTURES.teamId, now);

  sqlite.prepare(`
    INSERT OR IGNORE INTO offices (id, team_id, region_id, office_number, name, is_active, created_at)
    VALUES (?, ?, ?, '999', 'Test Office', 1, ?)
  `).run(TEST_FIXTURES.officeId, TEST_FIXTURES.teamId, TEST_FIXTURES.regionId, now);

  // Seed deterministic product category + product for QR tests
  sqlite.prepare(`
    INSERT OR IGNORE INTO product_categories (id, name, slug, sort_order, created_at)
    VALUES (?, 'Test Category', ?, 1, ?)
  `).run(TEST_FIXTURES.categoryId, TEST_FIXTURES.categoryId, now);

  sqlite.prepare(`
    INSERT OR IGNORE INTO products (id, category_id, name, slug, is_other, is_active, created_at)
    VALUES (?, ?, 'Test Product', 'test-product', 0, 1, ?)
  `).run(TEST_FIXTURES.productId, TEST_FIXTURES.categoryId, now);

  // Insert supervisor — assigned to the deterministic test team/region
  sqlite.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, role, team_id, region_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    TEST_USERS.supervisor.id,
    TEST_USERS.supervisor.name,
    TEST_USERS.supervisor.email,
    TEST_USERS.supervisor.role,
    TEST_FIXTURES.teamId,
    TEST_FIXTURES.regionId,
    now, now,
  );

  // Insert ci_specialist — same team/region
  sqlite.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, role, team_id, region_id, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `).run(
    TEST_USERS.ci_specialist.id,
    TEST_USERS.ci_specialist.name,
    TEST_USERS.ci_specialist.email,
    TEST_USERS.ci_specialist.role,
    TEST_FIXTURES.teamId,
    TEST_FIXTURES.regionId,
    now, now,
  );

  sqlite.close();

  console.log('[globalSetup] E2E test users and QR fixtures seeded.');
}
