/**
 * Admin operations for managing the SQLite database file itself.
 *
 *  - clearDatabase(): closes the singleton connection, renames the existing
 *    dev.db (plus WAL/SHM siblings) into <dbDir>/db-archive/ with a timestamp,
 *    then re-runs migrations and the reference seed *in-process*. The next
 *    request lazy-reopens the new file.
 *  - seedTestData(): runs the dev seed against the current DB *in-process*.
 *
 * Operations are restricted to the SQLite driver; PostgreSQL deployments
 * should manage their database out-of-band.
 *
 * NOTE: we deliberately do NOT shell out to `npm run …` here. That works on a
 * developer laptop but fails in containerised deployments (e.g. OpenShift S2I)
 * where the npm global path is not writable and `npx tsx` is unavailable at
 * runtime. Calling the seed/migrate functions directly works in both.
 */
import { rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { env } from '$env/dynamic/private';
import { resetDatabaseConnection } from '$lib/server/db/index.js';
import { runMigrations } from '$lib/server/db/migrate.js';

const ARCHIVE_DIR = 'db-archive';

function getSqlitePath(): string {
  const url = env.DATABASE_URL ?? 'file:./dev.db';
  return url.replace(/^file:/, '');
}

function assertSqlite(): void {
  const driver = env.DB_DRIVER ?? 'sqlite';
  if (driver !== 'sqlite') {
    throw new Error('Database admin operations are only available when DB_DRIVER=sqlite.');
  }
}

function timestampSuffix(): string {
  // 2026-05-15T18-22-04-123Z — safe for filenames on all platforms.
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function openFreshConnection(dbPath: string) {
  const { default: Database } = await import('better-sqlite3');
  const { drizzle }           = await import('drizzle-orm/better-sqlite3');
  const schema                = await import('$lib/server/db/schema/sqlite.js');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  return { sqlite, db, schema };
}

export interface ClearDatabaseResult {
  archivedAs: string | null;
}

export async function clearDatabase(): Promise<ClearDatabaseResult> {
  assertSqlite();
  const dbPath = getSqlitePath();
  const dbDir  = dirname(dbPath);
  const archiveDir = join(dbDir, ARCHIVE_DIR);

  // Drop the cached singleton so its open file handle is released before we
  // rename. On POSIX, rename-while-open succeeds, but the WAL/SHM siblings
  // need the connection gone or SQLite will re-create them mid-operation.
  await resetDatabaseConnection();

  if (!existsSync(archiveDir)) {
    await mkdir(archiveDir, { recursive: true });
  }

  let archived: string | null = null;
  if (existsSync(dbPath)) {
    const ts = timestampSuffix();
    const stem = basename(dbPath).replace(/\.db$/i, '');
    const archivedBase = `${stem}-${ts}`;
    archived = join(archiveDir, `${archivedBase}.db`);
    await rename(dbPath, archived);
    if (existsSync(`${dbPath}-wal`)) {
      await rename(`${dbPath}-wal`, join(archiveDir, `${archivedBase}.db-wal`));
    }
    if (existsSync(`${dbPath}-shm`)) {
      await rename(`${dbPath}-shm`, join(archiveDir, `${archivedBase}.db-shm`));
    }
  }

  // Apply migrations against the empty file (creates it if missing).
  await runMigrations();

  // Seed reference data using a one-shot connection we own and close.
  const { sqlite, db } = await openFreshConnection(dbPath);
  try {
    const { runReferenceSeed } = await import('$lib/server/db/seed.js');
    await runReferenceSeed(db);
  } finally {
    sqlite.close();
  }

  return { archivedAs: archived };
}

export async function seedTestData(): Promise<void> {
  assertSqlite();
  const dbPath = getSqlitePath();

  // The dev seed expects a real SQLite handle (it toggles pragmas for the
  // cleanup transaction). Use a fresh connection so we don't disturb the
  // app's singleton while it's mid-flight serving other requests.
  await resetDatabaseConnection();
  const { sqlite, db, schema } = await openFreshConnection(dbPath);
  try {
    const { runDevSeed } = await import('$lib/server/db/seed-dev.js');
    await runDevSeed(db, schema, sqlite);
  } finally {
    sqlite.close();
  }
}
