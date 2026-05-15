/**
 * Admin operations for managing the SQLite database file itself.
 *
 *  - clearDatabase(): closes the singleton connection, renames the existing
 *    dev.db (plus WAL/SHM siblings) into db-archive/, then re-runs migrations
 *    and the reference seed via the project's npm scripts. The next request
 *    lazy-reopens the new file.
 *  - seedTestData(): runs `npm run db:seed:dev` against the current DB.
 *
 * Both operations are restricted to the SQLite driver; PostgreSQL deployments
 * should manage their database out-of-band.
 */
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { env } from '$env/dynamic/private';
import { resetDatabaseConnection } from '$lib/server/db/index.js';

const execFileAsync = promisify(execFile);

const ARCHIVE_DIR = 'db-archive';
const SUBPROCESS_OPTS = {
  cwd: process.cwd(),
  // Seed-dev writes ~2000 transactions and prints progress; allow a generous buffer.
  maxBuffer: 32 * 1024 * 1024,
};

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

export interface ClearDatabaseResult {
  archivedAs: string | null;
  stdout: string;
}

export async function clearDatabase(): Promise<ClearDatabaseResult> {
  assertSqlite();
  const dbPath = getSqlitePath();
  const dbDir  = dirname(dbPath);
  const archiveDir = join(dbDir, ARCHIVE_DIR);

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

  const migrate = await execFileAsync('npm', ['run', 'db:migrate'], SUBPROCESS_OPTS);
  const seed    = await execFileAsync('npm', ['run', 'db:seed'],    SUBPROCESS_OPTS);

  return {
    archivedAs: archived,
    stdout: `${migrate.stdout}\n${seed.stdout}`,
  };
}

export interface SeedTestDataResult {
  stdout: string;
}

export async function seedTestData(): Promise<SeedTestDataResult> {
  assertSqlite();
  const { stdout } = await execFileAsync('npm', ['run', 'db:seed:dev'], SUBPROCESS_OPTS);
  return { stdout };
}
