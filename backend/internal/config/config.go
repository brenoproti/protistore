package config

import (
	"fmt"
	"os"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPass     string
	DBName     string
	JWTSecret  string
	UploadDir  string
	ServerPort string

	// S3
	S3Bucket    string
	S3Region    string
	S3AccessKey string
	S3SecretKey string
	S3Endpoint  string // optional, for MinIO or other S3-compatible services
}

func Load() *Config {
	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "3307"),
		DBUser:     getEnv("DB_USER", "vibestore"),
		DBPass:     getEnv("DB_PASS", "vibestore123"),
		DBName:     getEnv("DB_NAME", "vibestore"),
		JWTSecret:  getEnv("JWT_SECRET", "super-secret-key-change-in-production"),
		UploadDir:  getEnv("UPLOAD_DIR", "./uploads"),
		ServerPort: getEnv("SERVER_PORT", "8081"),

		S3Bucket:    getEnv("S3_BUCKET", ""),
		S3Region:    getEnv("S3_REGION", "us-east-1"),
		S3AccessKey: getEnv("S3_ACCESS_KEY", ""),
		S3SecretKey: getEnv("S3_SECRET_KEY", ""),
		S3Endpoint:  getEnv("S3_ENDPOINT", ""),
	}
}

func (c *Config) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci",
		c.DBUser, c.DBPass, c.DBHost, c.DBPort, c.DBName)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
