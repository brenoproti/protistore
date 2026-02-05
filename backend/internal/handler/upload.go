package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/vibestore/backend/internal/dto"
)

type UploadHandler struct {
	uploadDir string
}

func NewUploadHandler(uploadDir string) *UploadHandler {
	return &UploadHandler{uploadDir: uploadDir}
}

// POST /api/v1/admin/upload
func (h *UploadHandler) Upload(w http.ResponseWriter, r *http.Request) {
	r.ParseMultipartForm(10 << 20) // 10 MB

	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "File is required")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true, ".svg": true}
	if !allowedExts[ext] {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid file type. Allowed: jpg, jpeg, png, gif, webp, svg")
		return
	}

	if err := os.MkdirAll(h.uploadDir, 0755); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create upload directory")
		return
	}

	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	dst, err := os.Create(filepath.Join(h.uploadDir, filename))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save file")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to save file")
		return
	}

	writeJSON(w, http.StatusOK, dto.UploadResponse{
		URL: fmt.Sprintf("/uploads/%s", filename),
	})
}
