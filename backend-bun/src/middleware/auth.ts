import Elysia from "elysia";
import { verifyToken } from "../services/auth";
import { parseCookies, COOKIE_ACCESS } from "../helpers/cookie";

export const authMiddleware = new Elysia({ name: "auth" }).derive(
  { as: "scoped" },
  async ({ request, set, storeId }) => {
    // Read token from Authorization header or httpOnly cookie
    let token = "";
    const header = request.headers.get("authorization") || "";
    if (header.startsWith("Bearer ")) {
      token = header.slice(7);
    } else {
      const cookies = parseCookies(request.headers.get("cookie"));
      token = cookies[COOKIE_ACCESS] || "";
    }

    if (!token) {
      set.status = 401;
      return { code: "UNAUTHORIZED", message: "Authorization required" };
    }

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
