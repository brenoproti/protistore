import { getPool, type RowDataPacket, type ResultSetHeader } from "../db";
import type { Banner } from "../types";

export async function findBannersByStoreID(storeId: number): Promise<Banner[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM banners WHERE store_id = ? ORDER BY sort_order",
    [storeId]
  );
  return rows as Banner[];
}

export async function findActiveBannersByStoreID(storeId: number): Promise<Banner[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM banners WHERE store_id = ? AND is_active = TRUE ORDER BY sort_order",
    [storeId]
  );
  return rows as Banner[];
}

export async function findBannerByID(id: number, storeId: number): Promise<Banner | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM banners WHERE id = ? AND store_id = ?",
    [id, storeId]
  );
  return (rows[0] as Banner) ?? null;
}

export async function createBanner(banner: Partial<Banner>): Promise<number> {
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO banners (store_id, title, subtitle, image_url, link_url, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [banner.store_id, banner.title, banner.subtitle ?? null, banner.image_url, banner.link_url ?? null, banner.sort_order ?? 0, banner.is_active ?? true]
  );
  return result.insertId;
}

export async function updateBanner(banner: Banner): Promise<void> {
  await getPool().query<ResultSetHeader>(
    `UPDATE banners SET title = ?, subtitle = ?, image_url = ?, link_url = ?, sort_order = ?, is_active = ? WHERE id = ? AND store_id = ?`,
    [banner.title, banner.subtitle, banner.image_url, banner.link_url, banner.sort_order, banner.is_active, banner.id, banner.store_id]
  );
}

export async function deleteBanner(id: number, storeId: number): Promise<void> {
  await getPool().query<ResultSetHeader>(
    "DELETE FROM banners WHERE id = ? AND store_id = ?",
    [id, storeId]
  );
}
