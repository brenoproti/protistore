import { getPool, type RowDataPacket, type ResultSetHeader } from "../db";
import type { Category } from "../types";

export async function findCategoriesByStoreID(storeId: number): Promise<Category[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM categories WHERE store_id = ? ORDER BY sort_order, name",
    [storeId]
  );
  return rows as Category[];
}

export async function findActiveCategoriesByStoreID(storeId: number): Promise<Category[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM categories WHERE store_id = ? AND is_active = TRUE ORDER BY sort_order, name",
    [storeId]
  );
  return rows as Category[];
}

export async function findCategoryByName(storeId: number, name: string): Promise<Category | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM categories WHERE store_id = ? AND LOWER(name) = LOWER(?)",
    [storeId, name]
  );
  return (rows[0] as Category) ?? null;
}

export async function findCategoryByID(id: number, storeId: number): Promise<Category | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM categories WHERE id = ? AND store_id = ?",
    [id, storeId]
  );
  return (rows[0] as Category) ?? null;
}

export async function createCategory(cat: Partial<Category>): Promise<number> {
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO categories (store_id, parent_id, name, slug, description, image_url, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [cat.store_id, cat.parent_id ?? null, cat.name, cat.slug, cat.description ?? null, cat.image_url ?? null, cat.sort_order ?? 0, cat.is_active ?? true]
  );
  return result.insertId;
}

export async function updateCategory(cat: Category): Promise<void> {
  await getPool().query<ResultSetHeader>(
    `UPDATE categories SET parent_id = ?, name = ?, slug = ?, description = ?, image_url = ?, sort_order = ?, is_active = ? WHERE id = ? AND store_id = ?`,
    [cat.parent_id, cat.name, cat.slug, cat.description, cat.image_url, cat.sort_order, cat.is_active, cat.id, cat.store_id]
  );
}

export async function deleteCategory(id: number, storeId: number): Promise<void> {
  await getPool().query<ResultSetHeader>(
    "DELETE FROM categories WHERE id = ? AND store_id = ?",
    [id, storeId]
  );
}

export function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<number, Category>();
  const roots: Category[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
