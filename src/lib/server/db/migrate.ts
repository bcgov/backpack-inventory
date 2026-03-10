/**
 * migrate.ts — run pending Drizzle migrations programmatically.
 *
 * Called at application startup in hooks.server.ts (dev only),
 * or as a standalone script in CI / deployment pipelines:
 *
 *   npx tsx src/lib/server/db/migrate.ts
 *
 * This is separate from drizzle-kit, which is the CLI tool for generating
 * migration files. This script *applies* already-generated migrations.
 */

import { env } from '$env/dynamic/private';

export async function runMigrations(): Promise<void> {
  const driver     = env.DB_DRIVER ?? 'sqlite';
  const dbUrl      = env.DATABASE_URL ?? 'file:./dev.db';

  if (driver === 'postgres') {
    const { drizzle }  = await import('drizzle-orm/postgres-js');
    const { migrate }  = await import('drizzle-orm/postgres-js/migrator');
    const postgres     = await import('postgres');

    // Use a dedicated single-connection client for migrations
    const client = postgres.default(dbUrl, { max: 1 });
    const db     = drizzle(client);

    await migrate(db, {
      migrationsFolder: './src/lib/server/db/migrations/pg',
    });

    await client.end();

  } else {
    const { drizzle }  = await import('drizzle-orm/better-sqlite3');
    const { migrate }  = await import('drizzle-orm/better-sqlite3/migrator');
    const Database     = await import('better-sqlite3');

    const filePath = dbUrl.replace(/^file:/, '');
    const client   = new Database.default(filePath);
    client.pragma('journal_mode = WAL');
    client.pragma('foreign_keys = ON');

    const db = drizzle(client);
    migrate(db, {
      migrationsFolder: './src/lib/server/db/migrations/sqlite',
    });

    client.close();
  }

  console.log(`[migrate] ✓ Migrations applied (driver: ${driver})`);
}

// Allow running directly: npx tsx migrate.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  // When run standalone, load .env manually
  const { config } = await import('dotenv');
  config();

  // Override the SvelteKit env import for standalone usage
  Object.assign(process.env, {
    DB_DRIVER:    process.env.DB_DRIVER    ?? 'sqlite',
    DATABASE_URL: process.env.DATABASE_URL ?? 'file:./dev.db',
  });

  runMigrations().catch((err) => {
    console.error('[migrate] ❌ Migration failed:', err);
    process.exit(1);
  });
}
