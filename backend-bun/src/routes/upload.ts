import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { authMiddleware } from "../middleware/auth";
import { config } from "../config";
import { join, extname } from "path";
import { mkdir } from "fs/promises";

export const uploadRoutes = new Elysia({ prefix: "/api/v1/admin" })
  .use(tenantMiddleware)
  .use(authMiddleware)
  .post("/upload", async ({ body, set }) => {
    const formData = body as { file?: File };
    const file = formData.file;

    if (!file || !(file instanceof File)) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "File is required" };
    }

    const ext = extname(file.name).toLowerCase();
    const allowedExts = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);
    if (!allowedExts.has(ext)) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Invalid file type. Allowed: jpg, jpeg, png, gif, webp, svg" };
    }

    await mkdir(config.uploadDir, { recursive: true });

    const filename = `${crypto.randomUUID()}${ext}`;
    const filepath = join(config.uploadDir, filename);

    await Bun.write(filepath, file);

    return { url: `/uploads/${filename}` };
  });
