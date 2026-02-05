package handler

import (
	"math"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/vibestore/backend/internal/dto"
	"github.com/vibestore/backend/internal/middleware"
	"github.com/vibestore/backend/internal/model"
	"github.com/vibestore/backend/internal/repository"
)

type ProductHandler struct {
	productRepo *repository.ProductRepository
}

func NewProductHandler(productRepo *repository.ProductRepository) *ProductHandler {
	return &ProductHandler{productRepo: productRepo}
}

// GET /api/v1/store/products
func (h *ProductHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetStoreID(r.Context())
	active := true
	params := dto.ProductListParams{
		Page:       queryInt(r, "page", 1),
		PerPage:    queryInt(r, "per_page", 12),
		Search:     r.URL.Query().Get("search"),
		CategoryID: queryUint64Ptr(r, "category_id"),
		BrandID:    queryUint64Ptr(r, "brand_id"),
		MinPrice:   queryFloat64Ptr(r, "min_price"),
		MaxPrice:   queryFloat64Ptr(r, "max_price"),
		Sort:       r.URL.Query().Get("sort"),
		Order:      r.URL.Query().Get("order"),
		Featured:   queryBoolPtr(r, "featured"),
		Active:     &active,
	}

	products, total, err := h.productRepo.FindByStoreID(r.Context(), storeID, params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list products")
		return
	}
	if products == nil {
		products = []model.Product{}
	}

	writeJSON(w, http.StatusOK, dto.PaginatedResponse{
		Data:       products,
		Total:      total,
		Page:       params.Page,
		PerPage:    params.PerPage,
		TotalPages: int(math.Ceil(float64(total) / float64(params.PerPage))),
	})
}

// GET /api/v1/store/products/{slug}
func (h *ProductHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetStoreID(r.Context())
	slug := chi.URLParam(r, "slug")

	product, err := h.productRepo.FindBySlug(r.Context(), slug, storeID)
	if err != nil || product == nil || !product.IsActive {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Product not found")
		return
	}

	// Get related products
	related, _ := h.productRepo.FindRelated(r.Context(), product.ID, storeID, product.CategoryID, 4)
	if related == nil {
		related = []model.Product{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"product": product,
		"related": related,
	})
}

// GET /api/v1/admin/products
func (h *ProductHandler) List(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	params := dto.ProductListParams{
		Page:       queryInt(r, "page", 1),
		PerPage:    queryInt(r, "per_page", 20),
		Search:     r.URL.Query().Get("search"),
		CategoryID: queryUint64Ptr(r, "category_id"),
		BrandID:    queryUint64Ptr(r, "brand_id"),
		MinPrice:   queryFloat64Ptr(r, "min_price"),
		MaxPrice:   queryFloat64Ptr(r, "max_price"),
		Sort:       r.URL.Query().Get("sort"),
		Order:      r.URL.Query().Get("order"),
		Featured:   queryBoolPtr(r, "featured"),
		Active:     queryBoolPtr(r, "active"),
	}

	products, total, err := h.productRepo.FindByStoreID(r.Context(), storeID, params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list products")
		return
	}
	if products == nil {
		products = []model.Product{}
	}

	writeJSON(w, http.StatusOK, dto.PaginatedResponse{
		Data:       products,
		Total:      total,
		Page:       params.Page,
		PerPage:    params.PerPage,
		TotalPages: int(math.Ceil(float64(total) / float64(params.PerPage))),
	})
}

// GET /api/v1/admin/products/{id}
func (h *ProductHandler) Get(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid product ID")
		return
	}

	product, err := h.productRepo.FindByID(r.Context(), id, storeID)
	if err != nil || product == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Product not found")
		return
	}

	writeJSON(w, http.StatusOK, product)
}

// POST /api/v1/admin/products
func (h *ProductHandler) Create(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())

	var req dto.ProductRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}
	if req.Name == "" || req.Slug == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name and slug are required")
		return
	}

	product := &model.Product{
		StoreID:        storeID,
		CategoryID:     req.CategoryID,
		BrandID:        req.BrandID,
		Name:           req.Name,
		Slug:           req.Slug,
		Description:    req.Description,
		Price:          req.Price,
		CompareAtPrice: req.CompareAtPrice,
		CostPrice:      req.CostPrice,
		SKU:            req.SKU,
		Stock:          req.Stock,
		IsActive:       req.IsActive,
		IsFeatured:     req.IsFeatured,
	}

	if err := h.productRepo.Create(r.Context(), product); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create product")
		return
	}

	// Add images
	if len(req.Images) > 0 {
		var images []model.ProductImage
		for _, img := range req.Images {
			images = append(images, model.ProductImage{
				ProductID: product.ID,
				URL:       img.URL,
				AltText:   img.AltText,
				SortOrder: img.SortOrder,
			})
		}
		if err := h.productRepo.ReplaceImages(r.Context(), product.ID, images); err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to add images")
			return
		}
		product.Images = images
	}

	writeJSON(w, http.StatusCreated, product)
}

// PUT /api/v1/admin/products/{id}
func (h *ProductHandler) Update(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid product ID")
		return
	}

	existing, err := h.productRepo.FindByID(r.Context(), id, storeID)
	if err != nil || existing == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Product not found")
		return
	}

	var req dto.ProductRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	existing.CategoryID = req.CategoryID
	existing.BrandID = req.BrandID
	existing.Name = req.Name
	existing.Slug = req.Slug
	existing.Description = req.Description
	existing.Price = req.Price
	existing.CompareAtPrice = req.CompareAtPrice
	existing.CostPrice = req.CostPrice
	existing.SKU = req.SKU
	existing.Stock = req.Stock
	existing.IsActive = req.IsActive
	existing.IsFeatured = req.IsFeatured

	if err := h.productRepo.Update(r.Context(), existing); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update product")
		return
	}

	// Update images
	if req.Images != nil {
		var images []model.ProductImage
		for _, img := range req.Images {
			images = append(images, model.ProductImage{
				ProductID: existing.ID,
				URL:       img.URL,
				AltText:   img.AltText,
				SortOrder: img.SortOrder,
			})
		}
		if err := h.productRepo.ReplaceImages(r.Context(), existing.ID, images); err != nil {
			writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update images")
			return
		}
		existing.Images = images
	}

	writeJSON(w, http.StatusOK, existing)
}

// DELETE /api/v1/admin/products/{id}
func (h *ProductHandler) Delete(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid product ID")
		return
	}

	if err := h.productRepo.Delete(r.Context(), id, storeID); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete product")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "Product deleted"})
}

