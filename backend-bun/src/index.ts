import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { config } from "./config";
import { getPool, runMigrations } from "./db";
import { logger } from "./logger";
// Routes
import { authRoutes } from "./routes/auth";
import { publicStoreRoutes, storeRoutes, adminStoreRoutes } from "./routes/store";
import { publicCategoryRoutes, adminCategoryRoutes } from "./routes/category";
import { publicBrandRoutes, adminBrandRoutes } from "./routes/brand";
import { publicProductRoutes, adminProductRoutes } from "./routes/product";
import { publicBannerRoutes, adminBannerRoutes } from "./routes/banner";
import { publicOrderRoutes, adminOrderRoutes } from "./routes/order";
import { dashboardRoutes } from "./routes/dashboard";
import { uploadRoutes } from "./routes/upload";
import { presignRoutes } from "./routes/presign";
import { importRoutes } from "./routes/import";
import { stopRateLimitCleanup } from "./middleware/rateLimit";
import { stopTokenCleanup } from "./services/auth";
import { closeEmailTransporter } from "./services/email";

async function main() {
  logger.info("=== ProtiStore Backend (Bun + Elysia) ===");
  logger.info(`Connecting to MySQL at ${config.dbHost}:${config.dbPort}...`);

  // Test connection
  const pool = getPool();
  await pool.query("SELECT 1");
  logger.info("Connected to MySQL successfully.");

  // Run migrations
  logger.info("Running migrations...");
  await runMigrations();
  logger.info("All migrations applied.");

  const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10 MB global limit

  const app = new Elysia()
    .onRequest(({ request }) => {
      (request as any).__start = Date.now();

      const contentLength = Number(request.headers.get("content-length") || "0");
      if (contentLength > MAX_BODY_SIZE) {
        throw new Error("PAYLOAD_TOO_LARGE");
      }
    })
    .onAfterResponse(({ request, set }) => {
      const ms = Date.now() - ((request as any).__start || Date.now());
      const status = set.status || 200;
      const method = request.method;
      const url = new URL(request.url).pathname;

      // Skip noisy requests
      if (url === "/health" || url.startsWith("/uploads")) return;

      const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
      logger[level]({ method, url, status, ms }, `${method} ${url}`);
    })
    // Security headers
    .onAfterHandle(({ set }) => {
      set.headers["X-Content-Type-Options"] = "nosniff";
      set.headers["X-Frame-Options"] = "DENY";
      set.headers["X-XSS-Protection"] = "1; mode=block";
      set.headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
      set.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
      set.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
      set.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'";
    })
    .onError(({ code, error, set }) => {
      if (error.message === "PAYLOAD_TOO_LARGE") {
        set.status = 413;
        return { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" };
      }
      if (code === "NOT_FOUND") {
        set.status = 404;
        return { code: "NOT_FOUND", message: "Route not found" };
      }
      logger.error(error, "Unhandled error");
      set.status = 500;
      return { code: "INTERNAL_ERROR", message: "Internal server error" };
    })
    .use(
      cors({
        origin: new RegExp(
          `^https?://([a-z0-9-]+\\.)?(${config.corsDomains.split(",").map(d => d.trim().replace(/\./g, "\\.")).join("|")})(:\\d+)?$`
        ),
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Accept", "Authorization", "Content-Type", "X-Store-Slug"],
        exposeHeaders: ["Link"],
        credentials: true,
        maxAge: 300,
      })
    )
    // Health check (includes DB connectivity)
    .get("/health", async ({ set }) => {
      try {
        await getPool().query("SELECT 1");
        return { status: "ok" };
      } catch {
        set.status = 503;
        return { status: "error", message: "Database unavailable" };
      }
    })
    // Static files
    .get("/uploads/*", async ({ params, set }) => {
      const requestedPath = (params as Record<string, string>)["*"];
      // Prevent path traversal
      if (requestedPath.includes("..") || requestedPath.includes("\0")) {
        set.status = 400;
        return { code: "BAD_REQUEST", message: "Invalid file path" };
      }
      const filePath = `${config.uploadDir}/${requestedPath}`;
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return file;
      }
      set.status = 404;
      return { code: "NOT_FOUND", message: "File not found" };
    })
    // Public routes (no tenant)
    .use(publicStoreRoutes)
    // Auth routes (tenant only)
    .use(authRoutes)
    // Public tenant routes
    .use(storeRoutes)
    .use(publicCategoryRoutes)
    .use(publicBrandRoutes)
    .use(publicProductRoutes)
    .use(publicBannerRoutes)
    .use(publicOrderRoutes)
    // Admin routes (tenant + auth) - import/export BEFORE :id routes
    .use(importRoutes)
    .use(adminStoreRoutes)
    .use(adminCategoryRoutes)
    .use(adminBrandRoutes)
    .use(adminProductRoutes)
    .use(adminBannerRoutes)
    .use(adminOrderRoutes)
    .use(dashboardRoutes)
    .use(uploadRoutes)
    .use(presignRoutes)
    .listen(config.serverPort);

  logger.info(`Server running on port ${config.serverPort}`);

  // Graceful shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    stopRateLimitCleanup();
    stopTokenCleanup();
    await closeEmailTransporter();
    try {
      await getPool().end();
    } catch { /* ignore */ }
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  logger.fatal(err, "Failed to start server");
  process.exit(1);
});
