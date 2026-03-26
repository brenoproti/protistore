import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { authMiddleware } from "../middleware/auth";
import * as productRepo from "../repositories/product";
import type { ProductRequest, ProductListParams } from "../types";

export const publicProductRoutes = new Elysia({ prefix: "/api/v1" })
  .use(tenantMiddleware)
  .get("/store/products", async ({ query, storeId }) => {
    const brandIdsRaw = (query.brand_ids as string) || "";
    const brandIds = brandIdsRaw
      ? brandIdsRaw.split(",").map(Number).filter((n) => !Number.isNaN(n))
      : undefined;

    const params: ProductListParams = {
      page: Number(query.page) || 1,
      per_page: Number(query.per_page) || 12,
      search: (query.search as string) || undefined,
      category_id: query.category_id ? Number(query.category_id) : undefined,
      brand_id: query.brand_id ? Number(query.brand_id) : undefined,
      brand_ids: brandIds && brandIds.length > 0 ? brandIds : undefined,
      min_price: query.min_price || query.price_min ? Number(query.min_price || query.price_min) : undefined,
      max_price: query.max_price || query.price_max ? Number(query.max_price || query.price_max) : undefined,
      sort: (query.sort as string) || undefined,
      order: (query.order as string) || undefined,
      featured: query.featured ? query.featured === "true" : undefined,
      active: true,
    };

    const { products, total } = await productRepo.findProductsByStoreID(storeId, params);
    return {
      data: products,
      total,
      page: params.page,
      per_page: params.per_page,
      total_pages: Math.ceil(total / params.per_page),
    };
  })
  .get("/store/products/:slug", async ({ params, storeId, set }) => {
    const product = await productRepo.findProductBySlug(params.slug, storeId);
    if (!product) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Product not found" };
    }
    const related = await productRepo.findRelatedProducts(product.id, storeId, product.category_id, 4);
    return { product, related };
  });

export const adminProductRoutes = new Elysia({ prefix: "/api/v1/admin/products" })
  .use(tenantMiddleware)
  .use(authMiddleware)
  .get("/", async ({ query, storeId }) => {
    const params: ProductListParams = {
      page: Number(query.page) || 1,
      per_page: Number(query.per_page) || 20,
      search: (query.search as string) || undefined,
      category_id: query.category_id ? Number(query.category_id) : undefined,
      brand_id: query.brand_id ? Number(query.brand_id) : undefined,
      min_price: query.min_price ? Number(query.min_price) : undefined,
      max_price: query.max_price ? Number(query.max_price) : undefined,
      sort: (query.sort as string) || undefined,
      order: (query.order as string) || undefined,
      featured: query.featured ? query.featured === "true" : undefined,
      active: query.active ? query.active === "true" : undefined,
    };

    const { products, total } = await productRepo.findProductsByStoreID(storeId, params);
    return {
      data: products,
      total,
      page: params.page,
      per_page: params.per_page,
      total_pages: Math.ceil(total / params.per_page),
    };
  })
  .get("/:id", async ({ params, storeId, set }) => {
    const product = await productRepo.findProductByID(Number(params.id), storeId);
    if (!product) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Product not found" };
    }
    return product;
  })
  .post("/", async ({ body, storeId, set }) => {
    const req = body as ProductRequest;
    const id = await productRepo.createProduct({ ...req, store_id: storeId });
    if (req.images && req.images.length > 0) {
      await productRepo.replaceImages(id, req.images);
    }
    const product = await productRepo.findProductByID(id, storeId);
    set.status = 201;
    return product;
  })
  .put("/:id", async ({ params, body, storeId, set }) => {
    const existing = await productRepo.findProductByID(Number(params.id), storeId);
    if (!existing) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Product not found" };
    }
    const req = body as ProductRequest;
    const updated = {
      ...existing,
      name: req.name,
      slug: req.slug,
      category_id: req.category_id ?? null,
      brand_id: req.brand_id ?? null,
      description: req.description ?? null,
      price: req.price,
      compare_at_price: req.compare_at_price ?? null,
      cost_price: req.cost_price ?? null,
      sku: req.sku ?? null,
      stock: req.stock,
      is_active: req.is_active,
      is_featured: req.is_featured,
    };
    await productRepo.updateProduct(updated);
    if (req.images) {
      await productRepo.replaceImages(existing.id, req.images);
    }
    return await productRepo.findProductByID(existing.id, storeId);
  })
  .delete("/:id", async ({ params, storeId, set }) => {
    const existing = await productRepo.findProductByID(Number(params.id), storeId);
    if (!existing) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Product not found" };
    }
    await productRepo.deleteProduct(existing.id, storeId);
    set.status = 204;
  });
