const IS_PROD = process.env.NODE_ENV === "production";

interface CookieOptions {
  name: string;
  value: string;
  maxAge: number; // seconds
  path?: string;
}

export function buildSetCookie({ name, value, maxAge, path = "/" }: CookieOptions): string {
  const parts = [
    `${name}=${value}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (IS_PROD) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearCookie(name: string, path = "/"): string {
  const parts = [
    `${name}=`,
    `Path=${path}`,
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (IS_PROD) parts.push("Secure");
  return parts.join("; ");
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const cookies: Record<string, string> = {};
  for (const pair of header.split(";")) {
    const [key, ...rest] = pair.split("=");
    if (key) cookies[key.trim()] = rest.join("=").trim();
  }
  return cookies;
}

export const COOKIE_ACCESS = "access_token";
export const COOKIE_REFRESH = "refresh_token";
export const ACCESS_MAX_AGE = 15 * 60; // 15 minutes
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
