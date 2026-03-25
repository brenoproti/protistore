function requireEnv(name: string, fallback?: string): string {
  const val = process.env[name] || fallback;
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

export const config = {
  dbHost: process.env.DB_HOST || "localhost",
  dbPort: parseInt(process.env.DB_PORT || "3306"),
  dbUser: requireEnv("DB_USER", process.env.NODE_ENV === "production" ? undefined : "vibestore"),
  dbPass: requireEnv("DB_PASS", process.env.NODE_ENV === "production" ? undefined : "vibestore123"),
  dbName: process.env.DB_NAME || "vibestore",
  jwtSecret: requireEnv("JWT_SECRET", process.env.NODE_ENV === "production" ? undefined : "dev-only-secret-not-for-production"),
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  serverPort: parseInt(process.env.SERVER_PORT || "8081"),
  s3Bucket: process.env.S3_BUCKET || "",
  s3Region: process.env.S3_REGION || "us-east-1",
  s3AccessKey: process.env.S3_ACCESS_KEY || "",
  s3SecretKey: process.env.S3_SECRET_KEY || "",
  s3Endpoint: process.env.S3_ENDPOINT || "",

  // CORS — comma-separated domains (e.g. "protistore.com,localhost")
  corsDomains: process.env.CORS_DOMAINS || "localhost",
  // Cookie domain — set to ".protistore.com" for subdomain sharing in production
  cookieDomain: process.env.COOKIE_DOMAIN || "",

  // Email (SMTP) — leave SMTP_HOST empty to disable email
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587"),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "noreply@protistore.com",
};
