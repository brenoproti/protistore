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
      multipleStatements: true,
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

  const db = getPool();
  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), "utf-8");
    await db.query(sql);
    logger.info(`Migration applied: ${file}`);
  }
}

export { type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader };
