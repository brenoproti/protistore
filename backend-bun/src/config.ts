export const config = {
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: parseInt(process.env.DB_PORT || "3308"),
  dbUser: process.env.DB_USER || "vibestore",
  dbPass: process.env.DB_PASS || "vibestore123",
  dbName: process.env.DB_NAME || "vibestore",
  jwtSecret: process.env.JWT_SECRET || "super-secret-key-change-in-production",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  serverPort: parseInt(process.env.SERVER_PORT || "8081"),
  s3Bucket: process.env.S3_BUCKET || "",
  s3Region: process.env.S3_REGION || "us-east-1",
  s3AccessKey: process.env.S3_ACCESS_KEY || "",
  s3SecretKey: process.env.S3_SECRET_KEY || "",
  s3Endpoint: process.env.S3_ENDPOINT || "",

  // Email (SMTP) — leave SMTP_HOST empty to disable email
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587"),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "noreply@protistore.com",
};
