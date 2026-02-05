package handler

import (
	"net/http"

	"github.com/vibestore/backend/internal/dto"
	"github.com/vibestore/backend/internal/middleware"
	"github.com/vibestore/backend/internal/repository"
)

type StoreHandler struct {
	storeRepo *repository.StoreRepository
}

func NewStoreHandler(storeRepo *repository.StoreRepository) *StoreHandler {
	return &StoreHandler{storeRepo: storeRepo}
}

// GET /api/v1/store/info - Public store info
func (h *StoreHandler) GetStoreInfo(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetStoreID(r.Context())
	store, err := h.storeRepo.FindByID(r.Context(), storeID)
	if err != nil || store == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Store not found")
		return
	}

	customization, _ := h.storeRepo.GetCustomization(r.Context(), storeID)

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"store":         store,
		"customization": customization,
	})
}

// GET /api/v1/admin/store - Admin get store
func (h *StoreHandler) AdminGetStore(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	store, err := h.storeRepo.FindByID(r.Context(), storeID)
	if err != nil || store == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Store not found")
		return
	}
	writeJSON(w, http.StatusOK, store)
}

// PUT /api/v1/admin/store - Admin update store
func (h *StoreHandler) AdminUpdateStore(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	store, err := h.storeRepo.FindByID(r.Context(), storeID)
	if err != nil || store == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Store not found")
		return
	}

	var req dto.UpdateStoreRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	if req.Name != "" {
		store.Name = req.Name
	}
	store.Description = req.Description
	store.LogoURL = req.LogoURL
	store.FaviconURL = req.FaviconURL

	if err := h.storeRepo.Update(r.Context(), store); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update store")
		return
	}

	writeJSON(w, http.StatusOK, store)
}
