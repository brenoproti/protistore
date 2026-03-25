import Elysia from "elysia";
import { verifyToken } from "../services/auth";

export const authMiddleware = new Elysia({ name: "auth" }).derive(
  { as: "scoped" },
  async ({ request, set, storeId }) => {
    const header = request.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) {
      set.status = 401;
      return { code: "UNAUTHORIZED", message: "Authorization required" };
    }

    const token = header.slice(7);
    try {
      const claims = await verifyToken(token);
      if (claims.type !== "access") {
        set.status = 401;
        return { code: "UNAUTHORIZED", message: "Invalid token type" };
      }

      // Cross-store validation
      if (claims.store_id !== storeId) {
        set.status = 401;
        return { code: "UNAUTHORIZED", message: "Token does not match store" };
      }

      return {
        adminId: claims.admin_id,
        adminStoreId: claims.store_id,
        adminEmail: claims.email,
      };
    } catch {
      set.status = 401;
      return { code: "UNAUTHORIZED", message: "Invalid or expired token" };
    }
  }
);
