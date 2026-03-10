/**
 * Database connection factory.
 *
 * Reads DB_DRIVER from the environment and returns the correct Drizzle
 * instance and schema. This is the only place in the app that touches
 * the driver — everywhere else imports from this module.
 *
 * ┌─────────────────┬──────────────────────────────────────────────────────┐
 * │ DB_DRIVER       │ Connection                                           │
 * ├─────────────────┼──────────────────────────────────────────────────────┤
 * │ sqlite (default)│ better-sqlite3, file path from DATABASE_URL          │
 * │                 │ e.g. DATABASE_URL=file:./dev.db                      │
 * ├─────────────────┼──────────────────────────────────────────────────────┤
 * │ postgres        │ postgres.js, full DSN from DATABASE_URL              │
 * │                 │ e.g. DATABASE_URL=postgres://user:pw@host:5432/dbname│
 * └─────────────────┴──────────────────────────────────────────────────────┘
 *
 * To switch to PostgreSQL in production:
 *   1. Set DB_DRIVER=postgres in your environment / .env
 *   2. Set DATABASE_URL to a valid PostgreSQL DSN
 *   3. Run: npx drizzle-kit migrate
 *   No code changes are required.
 */

import { env } from '$env/dynamic/private';

// ─── Types exported for use throughout the server layer ──────────────────────

export type { DrizzleDB, AppSchema };

// ─── Lazy-initialised singleton ──────────────────────────────────────────────

let _db: DrizzleDB | undefined;
let _schema: AppSchema | undefined;

async function createConnection(): Promise<{ db: DrizzleDB; schema: AppSchema }> {
  const driver = env.DB_DRIVER ?? 'sqlite';

  if (driver === 'postgres') {
    // ── PostgreSQL ────────────────────────────────────────────────────────
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres   = await import('postgres');
    const schema     = await import('./schema/pg.js');

    const client = postgres.default(env.DATABASE_URL!, {
      max: 10,          // connection pool size
      idle_timeout: 30, // seconds
      connect_timeout: 10,
    });

    const db = drizzle(client, { schema, logger: env.DB_LOG === 'true' }) as DrizzleDB;
    return { db, schema: schema as AppSchema };

  } else {
    // ── SQLite (default, for local development) ───────────────────────────
    const { drizzle }  = await import('drizzle-orm/better-sqlite3');
    const Database     = await import('better-sqlite3');
    const schema       = await import('./schema/sqlite.js');

    const dbPath = (env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '');
    const client = new Database.default(dbPath);

    // Enable WAL mode for better concurrent read performance
    client.pragma('journal_mode = WAL');
    client.pragma('foreign_keys = ON');

    const db = drizzle(client, { schema, logger: env.DB_LOG === 'true' }) as DrizzleDB;
    return { db, schema: schema as AppSchema };
  }
}

/**
 * Returns the singleton database instance.
 * Safe to call from any server-side module — initialises once.
 */
export async function getDb(): Promise<DrizzleDB> {
  if (!_db) {
    const conn = await createConnection();
    _db     = conn.db;
    _schema = conn.schema;
  }
  return _db;
}

export async function getSchema(): Promise<AppSchema> {
  if (!_schema) {
    const conn = await createConnection();
    _db     = conn.db;
    _schema = conn.schema;
  }
  return _schema;
}

// ─── Type aliases ─────────────────────────────────────────────────────────────
//
// DrizzleDB is intentionally loose here — the full generic type is too complex
// to inline and the concrete type is inferred at the call site.
// If you need the precise type for a utility, import from the schema file directly.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDB = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppSchema = any;
