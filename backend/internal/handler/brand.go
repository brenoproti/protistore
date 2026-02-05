package handler

import (
	"net/http"

	"github.com/vibestore/backend/internal/dto"
	"github.com/vibestore/backend/internal/middleware"
	"github.com/vibestore/backend/internal/model"
	"github.com/vibestore/backend/internal/repository"
)

type BrandHandler struct {
	brandRepo *repository.BrandRepository
}

func NewBrandHandler(brandRepo *repository.BrandRepository) *BrandHandler {
	return &BrandHandler{brandRepo: brandRepo}
}

// GET /api/v1/store/brands
func (h *BrandHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetStoreID(r.Context())
	brands, err := h.brandRepo.FindActiveByStoreID(r.Context(), storeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list brands")
		return
	}
	if brands == nil {
		brands = []model.Brand{}
	}
	writeJSON(w, http.StatusOK, brands)
}

// GET /api/v1/admin/brands
func (h *BrandHandler) List(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	brands, err := h.brandRepo.FindByStoreID(r.Context(), storeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list brands")
		return
	}
	if brands == nil {
		brands = []model.Brand{}
	}
	writeJSON(w, http.StatusOK, brands)
}

// GET /api/v1/admin/brands/{id}
func (h *BrandHandler) Get(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid brand ID")
		return
	}
	brand, err := h.brandRepo.FindByID(r.Context(), id, storeID)
	if err != nil || brand == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Brand not found")
		return
	}
	writeJSON(w, http.StatusOK, brand)
}

// POST /api/v1/admin/brands
func (h *BrandHandler) Create(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())

	var req dto.BrandRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}
	if req.Name == "" || req.Slug == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name and slug are required")
		return
	}

	brand := &model.Brand{
		StoreID:  storeID,
		Name:     req.Name,
		Slug:     req.Slug,
		LogoURL:  req.LogoURL,
		IsActive: req.IsActive,
	}

	if err := h.brandRepo.Create(r.Context(), brand); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create brand")
		return
	}

	writeJSON(w, http.StatusCreated, brand)
}

// PUT /api/v1/admin/brands/{id}
func (h *BrandHandler) Update(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid brand ID")
		return
	}

	existing, err := h.brandRepo.FindByID(r.Context(), id, storeID)
	if err != nil || existing == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Brand not found")
		return
	}

	var req dto.BrandRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	existing.Name = req.Name
	existing.Slug = req.Slug
	existing.LogoURL = req.LogoURL
	existing.IsActive = req.IsActive

	if err := h.brandRepo.Update(r.Context(), existing); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update brand")
		return
	}

	writeJSON(w, http.StatusOK, existing)
}

// DELETE /api/v1/admin/brands/{id}
func (h *BrandHandler) Delete(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid brand ID")
		return
	}

	if err := h.brandRepo.Delete(r.Context(), id, storeID); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete brand")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Brand deleted"})
}
