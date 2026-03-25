import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { login, refresh } from "../services/auth";

export const authRoutes = new Elysia({ prefix: "/api/v1/auth" })
  .use(tenantMiddleware)
  .post("/login", async ({ body, storeId, set }) => {
    try {
      const result = await login(body as { email: string; password: string }, storeId);
      return result;
    } catch (err: unknown) {
      set.status = 401;
      return { code: "UNAUTHORIZED", message: (err as Error).message };
    }
  })
  .post("/refresh", async ({ body, set }) => {
    try {
      const { refresh_token } = body as { refresh_token: string };
      if (!refresh_token) {
        set.status = 400;
        return { code: "VALIDATION_ERROR", message: "refresh_token is required" };
      }
      const result = await refresh(refresh_token);
      return result;
    } catch (err: unknown) {
      set.status = 401;
      return { code: "UNAUTHORIZED", message: (err as Error).message };
    }
  })
  .post("/logout", () => {
    return { message: "Logged out successfully" };
  });
