import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { authMiddleware } from "../middleware/auth";
import { config } from "../config";
import { extname } from "path";
import type { PresignRequestBody } from "../types";

export const presignRoutes = new Elysia({ prefix: "/api/v1/admin" })
  .use(tenantMiddleware)
  .use(authMiddleware)
  .post("/presign", async ({ body, set }) => {
    if (!config.s3Bucket || !config.s3AccessKey) {
      set.status = 501;
      return { code: "NOT_CONFIGURED", message: "S3 is not configured" };
    }

    const req = body as PresignRequestBody;

    if (!req.filename || !req.content_type) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "filename and content_type are required" };
    }

    const ext = extname(req.filename).toLowerCase();
    const allowedExts = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);
    if (!allowedExts.has(ext)) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Invalid file type. Allowed: jpg, jpeg, png, gif, webp, svg" };
    }

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]);
    if (!allowedTypes.has(req.content_type)) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Invalid content type" };
    }

    try {
      const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      const clientOpts: Record<string, unknown> = {
        region: config.s3Region,
        credentials: {
          accessKeyId: config.s3AccessKey,
          secretAccessKey: config.s3SecretKey,
        },
      };

      if (config.s3Endpoint) {
        clientOpts.endpoint = config.s3Endpoint;
        clientOpts.forcePathStyle = true;
      }

      const client = new S3Client(clientOpts as ConstructorParameters<typeof S3Client>[0]);
      const key = `uploads/${crypto.randomUUID()}${ext}`;

      const command = new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: key,
        ContentType: req.content_type,
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });

      let baseUrl = `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com`;
      if (config.s3Endpoint) {
        baseUrl = `${config.s3Endpoint.replace(/\/$/, "")}/${config.s3Bucket}`;
      }

      return {
        upload_url: uploadUrl,
        file_url: `${baseUrl}/${key}`,
      };
    } catch (err: unknown) {
      set.status = 500;
      return { code: "INTERNAL_ERROR", message: "Failed to generate presigned URL" };
    }
  });
