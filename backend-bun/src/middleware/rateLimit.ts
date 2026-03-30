import Elysia from "elysia";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_STORE_SIZE = 10_000;

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup stale entries every minute
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [name, store] of stores) {
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
    if (store.size === 0) stores.delete(name);
  }
}, 60 * 1000);

export function stopRateLimitCleanup() {
  clearInterval(cleanupInterval);
}

function getStore(name: string): Map<string, RateLimitEntry> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

function getClientIP(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

interface RateLimitOptions {
  name: string;
  max: number;
  windowSec: number;
}

export function rateLimit({ name, max, windowSec }: RateLimitOptions) {
  const store = getStore(name);
  const windowMs = windowSec * 1000;

  return new Elysia({ name: `rateLimit:${name}` }).onBeforeHandle(
    ({ request, set }) => {
      const ip = getClientIP(request);
      const now = Date.now();
      const entry = store.get(ip);

      if (!entry || now > entry.resetAt) {
        // New IP — check if store is full
        if (!entry && store.size >= MAX_STORE_SIZE) {
          set.status = 429;
          set.headers["Retry-After"] = String(windowSec);
          return {
            code: "TOO_MANY_REQUESTS",
            message: "Too many requests. Please try again later.",
          };
        }
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return;
      }

      entry.count++;

      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        set.status = 429;
        set.headers["Retry-After"] = String(retryAfter);
        return {
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        };
      }
    }
  );
}
