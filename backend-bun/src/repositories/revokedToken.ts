import { getPool } from "../db";
import type { RowDataPacket } from "../db";

export async function revokeToken(jti: string, adminId: number, expiresAt: Date): Promise<void> {
  const pool = getPool();
  await pool.execute(
    "INSERT IGNORE INTO revoked_tokens (token_jti, admin_id, expires_at) VALUES (?, ?, ?)",
    [jti, adminId, expiresAt]
  );
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT 1 FROM revoked_tokens WHERE token_jti = ? LIMIT 1",
    [jti]
  );
  return rows.length > 0;
}

export async function cleanupExpiredTokens(): Promise<void> {
  const pool = getPool();
  await pool.execute("DELETE FROM revoked_tokens WHERE expires_at < NOW()");
}
