import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { authMiddleware } from "../middleware/auth";
import * as bannerRepo from "../repositories/banner";
import type { BannerRequest } from "../types";

export const publicBannerRoutes = new Elysia({ prefix: "/api/v1" })
  .use(tenantMiddleware)
  .get("/store/banners", async ({ storeId }) => {
    return await bannerRepo.findActiveBannersByStoreID(storeId);
  });

export const adminBannerRoutes = new Elysia({ prefix: "/api/v1/admin/banners" })
  .use(tenantMiddleware)
  .use(authMiddleware)
  .get("/", async ({ storeId }) => {
    return await bannerRepo.findBannersByStoreID(storeId);
  })
  .get("/:id", async ({ params, storeId, set }) => {
    const banner = await bannerRepo.findBannerByID(Number(params.id), storeId);
    if (!banner) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Banner not found" };
    }
    return banner;
  })
  .post("/", async ({ body, storeId, set }) => {
    const req = body as BannerRequest;
    const id = await bannerRepo.createBanner({ ...req, store_id: storeId });
    const banner = await bannerRepo.findBannerByID(id, storeId);
    set.status = 201;
    return banner;
  })
  .put("/:id", async ({ params, body, storeId, set }) => {
    const existing = await bannerRepo.findBannerByID(Number(params.id), storeId);
    if (!existing) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Banner not found" };
    }
    const req = body as BannerRequest;
    const updated = {
      ...existing,
      title: req.title,
      subtitle: req.subtitle ?? null,
      image_url: req.image_url,
      link_url: req.link_url ?? null,
      sort_order: req.sort_order,
      is_active: req.is_active,
    };
    await bannerRepo.updateBanner(updated);
    return await bannerRepo.findBannerByID(existing.id, storeId);
  })
  .delete("/:id", async ({ params, storeId, set }) => {
    const existing = await bannerRepo.findBannerByID(Number(params.id), storeId);
    if (!existing) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Banner not found" };
    }
    await bannerRepo.deleteBanner(existing.id, storeId);
    set.status = 204;
  });
