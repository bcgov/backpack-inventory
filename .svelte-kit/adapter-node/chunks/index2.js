import { b as private_env } from "./shared-server.js";
let _db;
let _schema;
async function createConnection() {
  const driver = private_env.DB_DRIVER ?? "sqlite";
  if (driver === "postgres") {
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const postgres = await import("postgres");
    const schema = await import("./pg.js");
    const client = postgres.default(private_env.DATABASE_URL, {
      max: 10,
      // connection pool size
      idle_timeout: 30,
      // seconds
      connect_timeout: 10
    });
    const db = drizzle(client, { schema, logger: private_env.DB_LOG === "true" });
    return { db, schema };
  } else {
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const Database = await import("better-sqlite3");
    const schema = await import("./sqlite.js");
    const dbPath = (private_env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
    const client = new Database.default(dbPath);
    client.pragma("journal_mode = WAL");
    client.pragma("foreign_keys = ON");
    const db = drizzle(client, { schema, logger: private_env.DB_LOG === "true" });
    return { db, schema };
  }
}
async function getDb() {
  if (!_db) {
    const conn = await createConnection();
    _db = conn.db;
    _schema = conn.schema;
  }
  return _db;
}
async function getSchema() {
  if (!_schema) {
    const conn = await createConnection();
    _db = conn.db;
    _schema = conn.schema;
  }
  return _schema;
}
export {
  getSchema as a,
  getDb as g
};
