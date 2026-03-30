import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { authMiddleware } from "../middleware/auth";
import * as storeRepo from "../repositories/store";
import type { UpdateStoreRequest, UpdateCustomizationRequest, StoreCustomization } from "../types";
import { toPublicStore, toPublicCustomization } from "../dto";

export const publicStoreRoutes = new Elysia()
  .get("/api/v1/stores", async () => {
    const stores = await storeRepo.listActiveStores();
    return stores.map(toPublicStore);
  });

export const storeRoutes = new Elysia({ prefix: "/api/v1" })
  .use(tenantMiddleware)
  .get("/store/info", async ({ storeId, set }) => {
    const store = await storeRepo.findStoreByID(storeId);
    if (!store) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Store not found" };
    }
    const customization = await storeRepo.getCustomization(storeId);
    return {
      store: toPublicStore(store),
      customization: customization ? toPublicCustomization(customization) : null,
    };
  });

export const adminStoreRoutes = new Elysia({ prefix: "/api/v1/admin" })
  .use(tenantMiddleware)
  .use(authMiddleware)
  .get("/store", async ({ storeId, set }) => {
    const store = await storeRepo.findStoreByID(storeId);
    if (!store) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Store not found" };
    }
    return store;
  })
  .put("/store", async ({ body, storeId, set }) => {
    const req = body as UpdateStoreRequest;
    const store = await storeRepo.findStoreByID(storeId);
    if (!store) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Store not found" };
    }
    store.name = req.name;
    store.description = req.description ?? store.description;
    store.logo_url = req.logo_url ?? store.logo_url;
    store.favicon_url = req.favicon_url ?? store.favicon_url;
    store.whatsapp_number = req.whatsapp_number ?? store.whatsapp_number;
    await storeRepo.updateStore(store);
    return store;
  })
  .get("/customization", async ({ storeId }) => {
    const customization = await storeRepo.getCustomization(storeId);
    if (customization) return customization;
    // Return defaults
    return {
      store_id: storeId,
      primary_color: "#6366f1",
      header_bg_color: "#ffffff",
      footer_bg_color: "#1f2937",
    };
  })
  .put("/customization", async ({ body, storeId }) => {
    const req = body as UpdateCustomizationRequest;
    const customization: StoreCustomization = {
      id: 0,
      store_id: storeId,
      primary_color: req.primary_color,
      header_bg_color: req.header_bg_color,
      footer_bg_color: req.footer_bg_color,
      created_at: "",
      updated_at: "",
    };
    await storeRepo.upsertCustomization(customization);
    return await storeRepo.getCustomization(storeId);
  });
