import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { rateLimit } from "../middleware/rateLimit";
import { login, refresh, logout } from "../services/auth";
import {
  buildSetCookie, buildClearCookie, parseCookies,
  COOKIE_ACCESS, COOKIE_REFRESH, ACCESS_MAX_AGE, REFRESH_MAX_AGE,
} from "../helpers/cookie";

function setAuthCookies(set: { headers: Record<string, string | string[] | undefined> }, accessToken: string, refreshToken: string) {
  set.headers["Set-Cookie"] = [
    buildSetCookie({ name: COOKIE_ACCESS, value: accessToken, maxAge: ACCESS_MAX_AGE }),
    buildSetCookie({ name: COOKIE_REFRESH, value: refreshToken, maxAge: REFRESH_MAX_AGE }),
  ] as any;
}

export const authRoutes = new Elysia({ prefix: "/api/v1/auth" })
  .use(tenantMiddleware)
  .use(rateLimit({ name: "auth", max: 10, windowSec: 60 }))
  .post("/login", async ({ body, storeId, set }) => {
    try {
      const result = await login(body as { email: string; password: string }, storeId);
      setAuthCookies(set, result.access_token, result.refresh_token);
      return result;
    } catch (err: unknown) {
      set.status = 401;
      return { code: "UNAUTHORIZED", message: (err as Error).message };
    }
  })
  .post("/refresh", async ({ request, body, storeId, set }) => {
    try {
      // Read refresh token from cookie or body
      const bodyToken = (body as { refresh_token?: string }).refresh_token;
      const cookies = parseCookies(request.headers.get("cookie"));
      const refreshToken = bodyToken || cookies[COOKIE_REFRESH];

      if (!refreshToken) {
        set.status = 400;
        return { code: "VALIDATION_ERROR", message: "refresh_token is required" };
      }
      const result = await refresh(refreshToken, storeId);
      setAuthCookies(set, result.access_token, result.refresh_token);
      return result;
    } catch (err: unknown) {
      set.status = 401;
      return { code: "UNAUTHORIZED", message: (err as Error).message };
    }
  })
  .post("/logout", async ({ request, body, set }) => {
    const bodyToken = (body as { refresh_token?: string })?.refresh_token;
    const cookies = parseCookies(request.headers.get("cookie"));
    const refreshToken = bodyToken || cookies[COOKIE_REFRESH];

    if (refreshToken) {
      await logout(refreshToken);
    }

    // Clear cookies
    set.headers["Set-Cookie"] = [
      buildClearCookie(COOKIE_ACCESS),
      buildClearCookie(COOKIE_REFRESH),
    ] as any;

    return { message: "Logged out successfully" };
  });
