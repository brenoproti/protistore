import { getPool, type RowDataPacket, type ResultSetHeader } from "../db";
import type { Product, ProductImage, ProductListParams } from "../types";

export async function findProductsByStoreID(
  storeId: number,
  params: ProductListParams
): Promise<{ products: Product[]; total: number }> {
  let where = "WHERE p.store_id = ?";
  const args: unknown[] = [storeId];

  if (params.search) {
    where += " AND (p.name LIKE ? OR p.sku LIKE ?)";
    const like = `%${params.search}%`;
    args.push(like, like);
  }
  if (params.category_id) {
    where += " AND p.category_id = ?";
    args.push(params.category_id);
  }
  if (params.brand_id) {
    where += " AND p.brand_id = ?";
    args.push(params.brand_id);
  }
  if (params.min_price !== undefined) {
    where += " AND p.price >= ?";
    args.push(params.min_price);
  }
  if (params.max_price !== undefined) {
    where += " AND p.price <= ?";
    args.push(params.max_price);
  }
  if (params.featured !== undefined) {
    where += " AND p.is_featured = ?";
    args.push(params.featured);
  }
  if (params.active !== undefined) {
    where += " AND p.is_active = ?";
    args.push(params.active);
  }

  // Count
  const [countRows] = await getPool().query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM products p ${where}`,
    args
  );
  const total = (countRows[0] as { total: number }).total;

  // Sort
  const sortCol = ({ name: "p.name", price: "p.price", stock: "p.stock" } as Record<string, string>)[params.sort || ""] || "p.created_at";
  const sortOrder = params.order === "asc" ? "ASC" : "DESC";

  const offset = (params.page - 1) * params.per_page;
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT p.* FROM products p ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`,
    [...args, params.per_page, offset]
  );

  const products = rows as Product[];

  // Load images for each product
  for (const product of products) {
    product.images = await findImagesByProductID(product.id);
  }

  return { products, total };
}

export async function findAllProductsByStoreID(storeId: number): Promise<Product[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM products WHERE store_id = ? ORDER BY name",
    [storeId]
  );
  return rows as Product[];
}

export async function findProductByID(id: number, storeId: number): Promise<Product | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM products WHERE id = ? AND store_id = ?",
    [id, storeId]
  );
  const product = (rows[0] as Product) ?? null;
  if (product) {
    product.images = await findImagesByProductID(product.id);
  }
  return product;
}

export async function findProductBySlug(slug: string, storeId: number): Promise<Product | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM products WHERE slug = ? AND store_id = ?",
    [slug, storeId]
  );
  const product = (rows[0] as Product) ?? null;
  if (product) {
    product.images = await findImagesByProductID(product.id);
  }
  return product;
}

export async function findRelatedProducts(
  productId: number,
  storeId: number,
  categoryId: number | null,
  limit: number
): Promise<Product[]> {
  let query: string;
  let args: unknown[];

  if (categoryId) {
    query = `SELECT * FROM products WHERE store_id = ? AND id != ? AND category_id = ? AND is_active = TRUE ORDER BY RAND() LIMIT ?`;
    args = [storeId, productId, categoryId, limit];
  } else {
    query = `SELECT * FROM products WHERE store_id = ? AND id != ? AND is_active = TRUE ORDER BY RAND() LIMIT ?`;
    args = [storeId, productId, limit];
  }

  const [rows] = await getPool().query<RowDataPacket[]>(query, args);
  const products = rows as Product[];

  for (const product of products) {
    product.images = await findImagesByProductID(product.id);
  }

  return products;
}

export async function createProduct(product: Partial<Product>): Promise<number> {
  const [result] = await getPool().query<ResultSetHeader>(
    `INSERT INTO products (store_id, category_id, brand_id, name, slug, description, price, compare_at_price, cost_price, sku, stock, is_active, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.store_id, product.category_id ?? null, product.brand_id ?? null,
      product.name, product.slug, product.description ?? null,
      product.price, product.compare_at_price ?? null, product.cost_price ?? null,
      product.sku ?? null, product.stock ?? 0, product.is_active ?? true, product.is_featured ?? false,
    ]
  );
  return result.insertId;
}

export async function updateProduct(product: Product): Promise<void> {
  await getPool().query<ResultSetHeader>(
    `UPDATE products SET category_id = ?, brand_id = ?, name = ?, slug = ?, description = ?, price = ?, compare_at_price = ?, cost_price = ?, sku = ?, stock = ?, is_active = ?, is_featured = ? WHERE id = ? AND store_id = ?`,
    [
      product.category_id, product.brand_id, product.name, product.slug, product.description,
      product.price, product.compare_at_price, product.cost_price,
      product.sku, product.stock, product.is_active, product.is_featured,
      product.id, product.store_id,
    ]
  );
}

export async function deleteProduct(id: number, storeId: number): Promise<void> {
  await getPool().query<ResultSetHeader>(
    "DELETE FROM products WHERE id = ? AND store_id = ?",
    [id, storeId]
  );
}

export async function findImagesByProductID(productId: number): Promise<ProductImage[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order",
    [productId]
  );
  return rows as ProductImage[];
}

export async function replaceImages(productId: number, images: { url: string; alt_text?: string | null; sort_order: number }[]): Promise<void> {
  const pool = getPool();
  await pool.query("DELETE FROM product_images WHERE product_id = ?", [productId]);

  for (const img of images) {
    await pool.query(
      "INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)",
      [productId, img.url, img.alt_text ?? null, img.sort_order]
    );
  }
}
