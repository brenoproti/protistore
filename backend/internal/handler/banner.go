package handler

import (
	"net/http"

	"github.com/vibestore/backend/internal/dto"
	"github.com/vibestore/backend/internal/middleware"
	"github.com/vibestore/backend/internal/model"
	"github.com/vibestore/backend/internal/repository"
)

type BannerHandler struct {
	bannerRepo *repository.BannerRepository
}

func NewBannerHandler(bannerRepo *repository.BannerRepository) *BannerHandler {
	return &BannerHandler{bannerRepo: bannerRepo}
}

// GET /api/v1/store/banners
func (h *BannerHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetStoreID(r.Context())
	banners, err := h.bannerRepo.FindActiveByStoreID(r.Context(), storeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list banners")
		return
	}
	if banners == nil {
		banners = []model.Banner{}
	}
	writeJSON(w, http.StatusOK, banners)
}

// GET /api/v1/admin/banners
func (h *BannerHandler) List(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	banners, err := h.bannerRepo.FindByStoreID(r.Context(), storeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list banners")
		return
	}
	if banners == nil {
		banners = []model.Banner{}
	}
	writeJSON(w, http.StatusOK, banners)
}

// GET /api/v1/admin/banners/{id}
func (h *BannerHandler) Get(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid banner ID")
		return
	}
	banner, err := h.bannerRepo.FindByID(r.Context(), id, storeID)
	if err != nil || banner == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Banner not found")
		return
	}
	writeJSON(w, http.StatusOK, banner)
}

// POST /api/v1/admin/banners
func (h *BannerHandler) Create(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())

	var req dto.BannerRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}
	if req.Title == "" || req.ImageURL == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title and image URL are required")
		return
	}

	banner := &model.Banner{
		StoreID:   storeID,
		Title:     req.Title,
		Subtitle:  req.Subtitle,
		ImageURL:  req.ImageURL,
		LinkURL:   req.LinkURL,
		SortOrder: req.SortOrder,
		IsActive:  req.IsActive,
	}

	if err := h.bannerRepo.Create(r.Context(), banner); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create banner")
		return
	}

	writeJSON(w, http.StatusCreated, banner)
}

// PUT /api/v1/admin/banners/{id}
func (h *BannerHandler) Update(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid banner ID")
		return
	}

	existing, err := h.bannerRepo.FindByID(r.Context(), id, storeID)
	if err != nil || existing == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Banner not found")
		return
	}

	var req dto.BannerRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	existing.Title = req.Title
	existing.Subtitle = req.Subtitle
	existing.ImageURL = req.ImageURL
	existing.LinkURL = req.LinkURL
	existing.SortOrder = req.SortOrder
	existing.IsActive = req.IsActive

	if err := h.bannerRepo.Update(r.Context(), existing); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update banner")
		return
	}

	writeJSON(w, http.StatusOK, existing)
}

// DELETE /api/v1/admin/banners/{id}
func (h *BannerHandler) Delete(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid banner ID")
		return
	}

	if err := h.bannerRepo.Delete(r.Context(), id, storeID); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete banner")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Banner deleted"})
}
