import { getPool, type RowDataPacket, type ResultSetHeader } from "../db";
import type { Store, StoreCustomization } from "../types";

export async function findStoreBySlug(slug: string): Promise<Store | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM stores WHERE slug = ?",
    [slug]
  );
  return (rows[0] as Store) ?? null;
}

export async function findStoreByID(id: number): Promise<Store | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM stores WHERE id = ?",
    [id]
  );
  return (rows[0] as Store) ?? null;
}

export async function listActiveStores(): Promise<Store[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM stores WHERE is_active = TRUE ORDER BY name"
  );
  return rows as Store[];
}

export async function updateStore(store: Store): Promise<void> {
  await getPool().query<ResultSetHeader>(
    `UPDATE stores SET name = ?, description = ?, logo_url = ?, favicon_url = ?, whatsapp_number = ? WHERE id = ?`,
    [store.name, store.description, store.logo_url, store.favicon_url, store.whatsapp_number, store.id]
  );
}

export async function getCustomization(storeId: number): Promise<StoreCustomization | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM store_customizations WHERE store_id = ?",
    [storeId]
  );
  return (rows[0] as StoreCustomization) ?? null;
}

export async function upsertCustomization(c: StoreCustomization): Promise<void> {
  await getPool().query(
    `INSERT INTO store_customizations
     (store_id, primary_color, accent_color, header_bg_color, footer_bg_color, custom_css)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
     primary_color = VALUES(primary_color),
     accent_color = VALUES(accent_color),
     header_bg_color = VALUES(header_bg_color),
     footer_bg_color = VALUES(footer_bg_color),
     custom_css = VALUES(custom_css)`,
    [c.store_id, c.primary_color, c.accent_color, c.header_bg_color, c.footer_bg_color, c.custom_css]
  );
}
