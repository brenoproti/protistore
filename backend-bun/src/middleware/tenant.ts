import Elysia from "elysia";
import { findStoreBySlug } from "../repositories/store";

export const tenantMiddleware = new Elysia({ name: "tenant" }).derive(
  { as: "scoped" },
  async ({ request, set }) => {
    // Extract slug from subdomain or X-Store-Slug header
    const host = request.headers.get("host") || "";
    let slug = "";

    // Check subdomain: e.g. mystore.protistore.localhost:5173
    const parts = host.split(".");
    if (parts.length >= 3) {
      // subdomain.domain.tld or subdomain.domain.localhost
      slug = parts[0];
    } else if (parts.length === 2 && parts[1].startsWith("localhost")) {
      // subdomain.localhost:port
      slug = parts[0];
      if (slug === "localhost") slug = "";
    }

    // Fallback to header
    if (!slug) {
      slug = request.headers.get("x-store-slug") || "";
    }

    if (!slug) {
      set.status = 400;
      return { code: "TENANT_REQUIRED", message: "Store slug is required" };
    }

    const store = await findStoreBySlug(slug);
    if (!store || !store.is_active) {
      set.status = 404;
      return { code: "STORE_NOT_FOUND", message: "Store not found" };
    }

    return { storeId: store.id, storeSlug: store.slug };
  }
);
