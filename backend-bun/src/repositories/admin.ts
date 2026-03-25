import { getPool, type RowDataPacket } from "../db";
import type { StoreAdmin } from "../types";

export async function findAdminByEmail(email: string, storeId: number): Promise<StoreAdmin | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM store_admins WHERE email = ? AND store_id = ?",
    [email, storeId]
  );
  return (rows[0] as StoreAdmin) ?? null;
}

export async function findAdminByID(id: number): Promise<StoreAdmin | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM store_admins WHERE id = ?",
    [id]
  );
  return (rows[0] as StoreAdmin) ?? null;
}

export async function findAdminEmailsByStoreID(storeId: number): Promise<string[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT email FROM store_admins WHERE store_id = ?",
    [storeId]
  );
  return rows.map((r) => (r as { email: string }).email);
}
