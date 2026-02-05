package handler

import (
	"net/http"

	"github.com/vibestore/backend/internal/dto"
	"github.com/vibestore/backend/internal/middleware"
	"github.com/vibestore/backend/internal/model"
	"github.com/vibestore/backend/internal/repository"
)

type CategoryHandler struct {
	categoryRepo *repository.CategoryRepository
}

func NewCategoryHandler(categoryRepo *repository.CategoryRepository) *CategoryHandler {
	return &CategoryHandler{categoryRepo: categoryRepo}
}

// GET /api/v1/store/categories - Public, returns tree
func (h *CategoryHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetStoreID(r.Context())
	categories, err := h.categoryRepo.FindActiveByStoreID(r.Context(), storeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list categories")
		return
	}
	tree := repository.BuildCategoryTree(categories)
	writeJSON(w, http.StatusOK, tree)
}

// GET /api/v1/admin/categories - Admin, returns flat list
func (h *CategoryHandler) List(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	categories, err := h.categoryRepo.FindByStoreID(r.Context(), storeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list categories")
		return
	}
	if categories == nil {
		categories = []model.Category{}
	}
	writeJSON(w, http.StatusOK, categories)
}

// GET /api/v1/admin/categories/{id}
func (h *CategoryHandler) Get(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid category ID")
		return
	}
	category, err := h.categoryRepo.FindByID(r.Context(), id, storeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get category")
		return
	}
	if category == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Category not found")
		return
	}
	writeJSON(w, http.StatusOK, category)
}

// POST /api/v1/admin/categories
func (h *CategoryHandler) Create(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())

	var req dto.CategoryRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}
	if req.Name == "" || req.Slug == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name and slug are required")
		return
	}

	category := &model.Category{
		StoreID:     storeID,
		ParentID:    req.ParentID,
		Name:        req.Name,
		Slug:        req.Slug,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		SortOrder:   req.SortOrder,
		IsActive:    req.IsActive,
	}

	if err := h.categoryRepo.Create(r.Context(), category); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create category")
		return
	}

	writeJSON(w, http.StatusCreated, category)
}

// PUT /api/v1/admin/categories/{id}
func (h *CategoryHandler) Update(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid category ID")
		return
	}

	existing, err := h.categoryRepo.FindByID(r.Context(), id, storeID)
	if err != nil || existing == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Category not found")
		return
	}

	var req dto.CategoryRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	existing.ParentID = req.ParentID
	existing.Name = req.Name
	existing.Slug = req.Slug
	existing.Description = req.Description
	existing.ImageURL = req.ImageURL
	existing.SortOrder = req.SortOrder
	existing.IsActive = req.IsActive

	if err := h.categoryRepo.Update(r.Context(), existing); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update category")
		return
	}

	writeJSON(w, http.StatusOK, existing)
}

// DELETE /api/v1/admin/categories/{id}
func (h *CategoryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid category ID")
		return
	}

	if err := h.categoryRepo.Delete(r.Context(), id, storeID); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete category")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Category deleted"})
}
