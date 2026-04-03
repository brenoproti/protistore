import mysql, { type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { config } from "./config";
import { logger } from "./logger";

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPass,
      database: config.dbName,
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4",
      multipleStatements: false,
      decimalNumbers: true,
      typeCast: function (field, next) {
        if (field.type === "TINY" && field.length === 1) {
          return field.string() === "1";
        }
        return next();
      },
    });
  }
  return pool;
}

export async function runMigrations(): Promise<void> {
  const migrationsDir = join(import.meta.dir, "..", "migrations");
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Migrations need multipleStatements; use a separate short-lived pool
  const migrationPool = mysql.createPool({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPass,
    database: config.dbName,
    charset: "utf8mb4",
    multipleStatements: true,
    connectionLimit: 1,
  });

  try {
    for (const file of files) {
      const sql = await readFile(join(migrationsDir, file), "utf-8");
      try {
        await migrationPool.query(sql);
        logger.info(`Migration applied: ${file}`);
      } catch (err: unknown) {
        const code = (err as { errno?: number }).errno;
        // 1060 = Duplicate column name — safe to ignore for idempotent migrations
        if (code === 1060) {
          logger.info(`Migration skipped (already applied): ${file}`);
        } else {
          throw err;
        }
      }
    }
  } finally {
    await migrationPool.end();
  }
}

export { type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader };
