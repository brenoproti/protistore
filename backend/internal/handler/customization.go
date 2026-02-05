package handler

import (
	"net/http"

	"github.com/vibestore/backend/internal/dto"
	"github.com/vibestore/backend/internal/middleware"
	"github.com/vibestore/backend/internal/model"
	"github.com/vibestore/backend/internal/repository"
)

type CustomizationHandler struct {
	storeRepo *repository.StoreRepository
}

func NewCustomizationHandler(storeRepo *repository.StoreRepository) *CustomizationHandler {
	return &CustomizationHandler{storeRepo: storeRepo}
}

// GET /api/v1/admin/customization
func (h *CustomizationHandler) Get(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	c, err := h.storeRepo.GetCustomization(r.Context(), storeID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to get customization")
		return
	}
	if c == nil {
		c = &model.StoreCustomization{
			StoreID:         storeID,
			PrimaryColor:    "#6366f1",
			SecondaryColor:  "#4f46e5",
			AccentColor:     "#f59e0b",
			BackgroundColor: "#ffffff",
			TextColor:       "#1f2937",
			HeaderBgColor:   "#ffffff",
			FooterBgColor:   "#1f2937",
			FontFamily:      "Inter",
			BorderRadius:    "8px",
		}
	}
	writeJSON(w, http.StatusOK, c)
}

// PUT /api/v1/admin/customization
func (h *CustomizationHandler) Update(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())

	var req dto.UpdateCustomizationRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	c := &model.StoreCustomization{
		StoreID:         storeID,
		PrimaryColor:    req.PrimaryColor,
		SecondaryColor:  req.SecondaryColor,
		AccentColor:     req.AccentColor,
		BackgroundColor: req.BackgroundColor,
		TextColor:       req.TextColor,
		HeaderBgColor:   req.HeaderBgColor,
		FooterBgColor:   req.FooterBgColor,
		FontFamily:      req.FontFamily,
		BorderRadius:    req.BorderRadius,
		CustomCSS:       req.CustomCSS,
	}

	if err := h.storeRepo.UpsertCustomization(r.Context(), c); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update customization")
		return
	}

	updated, _ := h.storeRepo.GetCustomization(r.Context(), storeID)
	writeJSON(w, http.StatusOK, updated)
}
