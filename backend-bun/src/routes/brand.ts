import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { authMiddleware } from "../middleware/auth";
import * as brandRepo from "../repositories/brand";
import type { BrandRequest } from "../types";
import { toPublicBrand } from "../dto";

export const publicBrandRoutes = new Elysia({ prefix: "/api/v1" })
  .use(tenantMiddleware)
  .get("/store/brands", async ({ storeId }) => {
    const brands = await brandRepo.findActiveBrandsByStoreID(storeId);
    return brands.map(toPublicBrand);
  });

export const adminBrandRoutes = new Elysia({ prefix: "/api/v1/admin/brands" })
  .use(tenantMiddleware)
  .use(authMiddleware)
  .get("/", async ({ storeId }) => {
    return await brandRepo.findBrandsByStoreID(storeId);
  })
  .get("/:id", async ({ params, storeId, set }) => {
    const brand = await brandRepo.findBrandByID(Number(params.id), storeId);
    if (!brand) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Brand not found" };
    }
    return brand;
  })
  .post("/", async ({ body, storeId, set }) => {
    const req = body as BrandRequest;
    const id = await brandRepo.createBrand({ ...req, store_id: storeId });
    const brand = await brandRepo.findBrandByID(id, storeId);
    set.status = 201;
    return brand;
  })
  .put("/:id", async ({ params, body, storeId, set }) => {
    const existing = await brandRepo.findBrandByID(Number(params.id), storeId);
    if (!existing) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Brand not found" };
    }
    const req = body as BrandRequest;
    const updated = {
      ...existing,
      name: req.name,
      slug: req.slug,
      logo_url: req.logo_url ?? null,
      is_active: req.is_active,
    };
    await brandRepo.updateBrand(updated);
    return await brandRepo.findBrandByID(existing.id, storeId);
  })
  .delete("/:id", async ({ params, storeId, set }) => {
    const existing = await brandRepo.findBrandByID(Number(params.id), storeId);
    if (!existing) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Brand not found" };
    }
    await brandRepo.deleteBrand(existing.id, storeId);
    set.status = 204;
  });
