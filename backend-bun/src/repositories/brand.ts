import { getPool, type RowDataPacket, type ResultSetHeader } from "../db";
import type { Brand } from "../types";

export async function findBrandsByStoreID(storeId: number): Promise<Brand[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM brands WHERE store_id = ? ORDER BY name",
    [storeId]
  );
  return rows as Brand[];
}

export async function findActiveBrandsByStoreID(storeId: number): Promise<Brand[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM brands WHERE store_id = ? AND is_active = TRUE ORDER BY name",
    [storeId]
  );
  return rows as Brand[];
}

export async function findBrandByName(storeId: number, name: string): Promise<Brand | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM brands WHERE store_id = ? AND LOWER(name) = LOWER(?)",
    [storeId, name]
  );
  return (rows[0] as Brand) ?? null;
}

export async function findBrandByID(id: number, storeId: number): Promise<Brand | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM brands WHERE id = ? AND store_id = ?",
    [id, storeId]
  );
  return (rows[0] as Brand) ?? null;
}

export async function createBrand(brand: Partial<Brand>): Promise<number> {
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO brands (store_id, name, slug, logo_url, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [brand.store_id, brand.name, brand.slug, brand.logo_url ?? null, brand.is_active ?? true]
  );
  return result.insertId;
}

export async function updateBrand(brand: Brand): Promise<void> {
  await getPool().query<ResultSetHeader>(
    `UPDATE brands SET name = ?, slug = ?, logo_url = ?, is_active = ? WHERE id = ? AND store_id = ?`,
    [brand.name, brand.slug, brand.logo_url, brand.is_active, brand.id, brand.store_id]
  );
}

export async function deleteBrand(id: number, storeId: number): Promise<void> {
  await getPool().query<ResultSetHeader>(
    "DELETE FROM brands WHERE id = ? AND store_id = ?",
    [id, storeId]
  );
}
