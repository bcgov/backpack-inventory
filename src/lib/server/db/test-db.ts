// src/lib/server/db/test-db.ts
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { randomUUID } from 'crypto';
import * as schema from './schema/sqlite.js';

export function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: 'src/lib/server/db/migrations/sqlite' });
  return { db, schema, sqlite };
}

/** Seed a minimal region → team → office chain and return their IDs. */
export function seedTestOffice(
  db: ReturnType<typeof createTestDb>['db'],
  overrides: { regionId?: string; teamId?: string; officeId?: string } = {},
) {
  const regionId = overrides.regionId ?? 'region-test';
  const teamId   = overrides.teamId   ?? 'team-test';
  const officeId = overrides.officeId ?? 'office-test';
  const now = new Date().toISOString();

  db.insert(schema.regions).values({ id: regionId, name: regionId, slug: regionId, createdAt: now }).onConflictDoNothing().run();
  db.insert(schema.teams).values({ id: teamId, regionId, name: teamId, slug: teamId, createdAt: now }).onConflictDoNothing().run();
  // Derive a unique office number from the officeId so multiple seedTestOffice
  // calls don't collide on the (office_number, name) unique constraint.
  const officeNumber = officeId.replace(/[^0-9]/g, '').slice(0, 6) || officeId.slice(0, 6);
  db.insert(schema.offices).values({ id: officeId, teamId, regionId, officeNumber, name: officeId, isActive: true, createdAt: now }).onConflictDoNothing().run();

  return { regionId, teamId, officeId };
}

/** Seed a product category + product and return their IDs. */
export function seedTestProduct(
  db: ReturnType<typeof createTestDb>['db'],
  overrides: { categoryId?: string; productId?: string } = {},
) {
  const categoryId = overrides.categoryId ?? 'cat-test';
  const productId  = overrides.productId  ?? 'prod-test';
  const now = new Date().toISOString();

  db.insert(schema.productCategories).values({ id: categoryId, name: 'Test Category', slug: categoryId, sortOrder: 1, createdAt: now }).onConflictDoNothing().run();
  db.insert(schema.products).values({ id: productId, categoryId, name: 'Test Product', slug: 'test-product', isOther: false, isActive: true, createdAt: now }).onConflictDoNothing().run();

  return { categoryId, productId };
}

/** Seed a user and return their ID. */
export function seedTestUser(
  db: ReturnType<typeof createTestDb>['db'],
  overrides: Partial<typeof schema.users.$inferInsert> = {},
) {
  const id = overrides.id ?? randomUUID();
  const now = new Date().toISOString();
  db.insert(schema.users).values({
    id,
    name:      overrides.name      ?? 'Test User',
    email:     overrides.email     ?? `test-${id}@example.com`,
    role:      overrides.role      ?? 'ci_specialist',
    teamId:    overrides.teamId    ?? 'team-test',
    regionId:  overrides.regionId  ?? 'region-test',
    isActive:  overrides.isActive  ?? true,
    createdAt: now,
    updatedAt: now,
  }).run();
  return id;
}
