import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { authMiddleware } from "../middleware/auth";
import * as catRepo from "../repositories/category";
import type { CategoryRequest } from "../types";

export const publicCategoryRoutes = new Elysia({ prefix: "/api/v1" })
  .use(tenantMiddleware)
  .get("/store/categories", async ({ storeId }) => {
    const cats = await catRepo.findActiveCategoriesByStoreID(storeId);
    return catRepo.buildCategoryTree(cats);
  });

export const adminCategoryRoutes = new Elysia({ prefix: "/api/v1/admin/categories" })
  .use(tenantMiddleware)
  .use(authMiddleware)
  .get("/", async ({ storeId }) => {
    return await catRepo.findCategoriesByStoreID(storeId);
  })
  .get("/:id", async ({ params, storeId, set }) => {
    const cat = await catRepo.findCategoryByID(Number(params.id), storeId);
    if (!cat) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Category not found" };
    }
    return cat;
  })
  .post("/", async ({ body, storeId, set }) => {
    const req = body as CategoryRequest;
    const id = await catRepo.createCategory({ ...req, store_id: storeId });
    const cat = await catRepo.findCategoryByID(id, storeId);
    set.status = 201;
    return cat;
  })
  .put("/:id", async ({ params, body, storeId, set }) => {
    const existing = await catRepo.findCategoryByID(Number(params.id), storeId);
    if (!existing) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Category not found" };
    }
    const req = body as CategoryRequest;
    const updated = {
      ...existing,
      name: req.name,
      slug: req.slug,
      parent_id: req.parent_id ?? null,
      description: req.description ?? null,
      image_url: req.image_url ?? null,
      sort_order: req.sort_order,
      is_active: req.is_active,
    };
    await catRepo.updateCategory(updated);
    return await catRepo.findCategoryByID(existing.id, storeId);
  })
  .delete("/:id", async ({ params, storeId, set }) => {
    const existing = await catRepo.findCategoryByID(Number(params.id), storeId);
    if (!existing) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Category not found" };
    }
    await catRepo.deleteCategory(existing.id, storeId);
    set.status = 204;
  });
