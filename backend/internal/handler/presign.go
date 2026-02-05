package handler

import (
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"

	"github.com/vibestore/backend/internal/config"
)

type PresignHandler struct {
	bucket   string
	region   string
	client   *s3.Client
	presign  *s3.PresignClient
	baseURL  string
}

type presignRequest struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
}

type presignResponse struct {
	UploadURL string `json:"upload_url"`
	FileURL   string `json:"file_url"`
}

func NewPresignHandler(cfg *config.Config) *PresignHandler {
	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.S3Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.S3AccessKey, cfg.S3SecretKey, "",
		)),
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(), opts...)
	if err != nil {
		panic(fmt.Sprintf("failed to load AWS config: %v", err))
	}

	var s3Opts []func(*s3.Options)
	if cfg.S3Endpoint != "" {
		s3Opts = append(s3Opts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(cfg.S3Endpoint)
			o.UsePathStyle = true
		})
	}

	client := s3.NewFromConfig(awsCfg, s3Opts...)
	presignClient := s3.NewPresignClient(client)

	baseURL := fmt.Sprintf("https://%s.s3.%s.amazonaws.com", cfg.S3Bucket, cfg.S3Region)
	if cfg.S3Endpoint != "" {
		baseURL = fmt.Sprintf("%s/%s", strings.TrimRight(cfg.S3Endpoint, "/"), cfg.S3Bucket)
	}

	return &PresignHandler{
		bucket:  cfg.S3Bucket,
		region:  cfg.S3Region,
		client:  client,
		presign: presignClient,
		baseURL: baseURL,
	}
}

// POST /api/v1/admin/presign
func (h *PresignHandler) Presign(w http.ResponseWriter, r *http.Request) {
	var req presignRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	if req.Filename == "" || req.ContentType == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "filename and content_type are required")
		return
	}

	ext := strings.ToLower(filepath.Ext(req.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true, ".svg": true}
	if !allowedExts[ext] {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid file type. Allowed: jpg, jpeg, png, gif, webp, svg")
		return
	}

	allowedTypes := map[string]bool{
		"image/jpeg": true, "image/png": true, "image/gif": true,
		"image/webp": true, "image/svg+xml": true,
	}
	if !allowedTypes[req.ContentType] {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid content type")
		return
	}

	key := fmt.Sprintf("uploads/%s%s", uuid.New().String(), ext)

	presignReq, err := h.presign.PresignPutObject(r.Context(), &s3.PutObjectInput{
		Bucket:      aws.String(h.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(req.ContentType),
	}, s3.WithPresignExpires(10*time.Minute))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to generate presigned URL")
		return
	}

	fileURL := fmt.Sprintf("%s/%s", h.baseURL, key)

	writeJSON(w, http.StatusOK, presignResponse{
		UploadURL: presignReq.URL,
		FileURL:   fileURL,
	})
}
