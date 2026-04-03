import { config } from "../config";

const IS_PROD = process.env.NODE_ENV === "production";

interface CookieOptions {
  name: string;
  value: string;
  maxAge: number; // seconds
  path?: string;
}

function buildCookieParts(name: string, value: string, maxAge: number, path = "/"): string[] {
  const parts = [
    `${name}=${value}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (config.cookieDomain) parts.push(`Domain=${config.cookieDomain}`);
  if (IS_PROD) parts.push("Secure");
  return parts;
}

export function buildSetCookie({ name, value, maxAge, path = "/" }: CookieOptions): string {
  return buildCookieParts(name, value, maxAge, path).join("; ");
}

export function buildClearCookie(name: string, path = "/"): string {
  return buildCookieParts(name, "", 0, path).join("; ");
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
export const ACCESS_MAX_AGE = 60 * 60; // 1 hour
export const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
