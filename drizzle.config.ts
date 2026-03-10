/**
 * drizzle.config.ts
 *
 * Drizzle Kit configuration. Reads DB_DRIVER to determine which schema
 * and dialect to use for migration generation and pushing.
 *
 * Usage:
 *   # SQLite (default — local dev)
 *   npx drizzle-kit generate
 *   npx drizzle-kit migrate
 *
 *   # PostgreSQL (production)
 *   DB_DRIVER=postgres DATABASE_URL=postgres://... npx drizzle-kit generate
 *   DB_DRIVER=postgres DATABASE_URL=postgres://... npx drizzle-kit migrate
 *
 *   # Introspect an existing database
 *   npx drizzle-kit introspect
 *
 *   # Open Drizzle Studio (visual DB browser)
 *   npx drizzle-kit studio
 */

import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const driver    = process.env.DB_DRIVER ?? 'sqlite';
const dbUrl     = process.env.DATABASE_URL ?? 'file:./dev.db';
const isPostgres = driver === 'postgres';

export default {
  dialect:       isPostgres ? 'postgresql' : 'sqlite',
  schema:        isPostgres
                   ? './src/lib/server/db/schema/pg.ts'
                   : './src/lib/server/db/schema/sqlite.ts',
  out:           isPostgres
                   ? './src/lib/server/db/migrations/pg'
                   : './src/lib/server/db/migrations/sqlite',
  dbCredentials: isPostgres
                   ? { url: dbUrl }
                   : { url: dbUrl },
  // Emit verbose SQL in migration files for auditability
  verbose: true,
  // Enforce that breaking changes (column drops, renames) require explicit
  // confirmation — prevents accidental data loss in production.
  strict:  true,
} satisfies Config;
