package handler

import (
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/vibestore/backend/internal/dto"
	"github.com/vibestore/backend/internal/middleware"
	"github.com/vibestore/backend/internal/model"
	"github.com/vibestore/backend/internal/repository"
)

type OrderHandler struct {
	orderRepo   *repository.OrderRepository
	productRepo *repository.ProductRepository
}

func NewOrderHandler(orderRepo *repository.OrderRepository, productRepo *repository.ProductRepository) *OrderHandler {
	return &OrderHandler{orderRepo: orderRepo, productRepo: productRepo}
}

// POST /api/v1/store/cart - Validate cart items
func (h *OrderHandler) ValidateCart(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetStoreID(r.Context())

	var req dto.CartValidationRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	allValid := true
	var items []dto.CartValidatedItem
	for _, item := range req.Items {
		product, err := h.productRepo.FindByID(r.Context(), item.ProductID, storeID)
		if err != nil || product == nil || !product.IsActive {
			items = append(items, dto.CartValidatedItem{
				ProductID: item.ProductID,
				Quantity:  item.Quantity,
				Available: false,
			})
			allValid = false
			continue
		}

		available := product.Stock >= item.Quantity
		if !available {
			allValid = false
		}

		var imgURL *string
		if len(product.Images) > 0 {
			imgURL = &product.Images[0].URL
		}

		items = append(items, dto.CartValidatedItem{
			ProductID:    product.ID,
			ProductName:  product.Name,
			ProductImage: imgURL,
			Price:        product.Price,
			Quantity:     item.Quantity,
			Stock:        product.Stock,
			Available:    available,
		})
	}

	writeJSON(w, http.StatusOK, dto.CartValidationResponse{
		Items: items,
		Valid: allValid,
	})
}

// POST /api/v1/store/orders - Checkout
func (h *OrderHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetStoreID(r.Context())

	var req dto.CheckoutRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	if req.CustomerName == "" || req.CustomerEmail == "" || len(req.Items) == 0 {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name, email, and items are required")
		return
	}

	// Validate delivery method
	validDeliveryMethods := map[string]bool{"pickup": true, "delivery": true}
	if req.DeliveryMethod == "" {
		req.DeliveryMethod = "delivery"
	}
	if !validDeliveryMethods[req.DeliveryMethod] {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid delivery method")
		return
	}

	// Validate payment method
	validPaymentMethods := map[string]bool{"credit_card": true, "debit_card": true, "cash": true, "pix": true, "pay_on_pickup": true}
	if req.DeliveryMethod == "pickup" {
		req.PaymentMethod = "pay_on_pickup"
	}
	if !validPaymentMethods[req.PaymentMethod] {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid payment method")
		return
	}

	// If delivery, require shipping address fields
	if req.DeliveryMethod == "delivery" {
		if req.ShippingAddress == "" || req.ShippingCity == "" || req.ShippingState == "" || req.ShippingZip == "" {
			writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Shipping address is required for delivery")
			return
		}
	}

	// Build order items and calculate totals
	var orderItems []model.OrderItem
	var subtotal float64

	for _, item := range req.Items {
		product, err := h.productRepo.FindByID(r.Context(), item.ProductID, storeID)
		if err != nil || product == nil || !product.IsActive {
			writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", fmt.Sprintf("Product %d not found or inactive", item.ProductID))
			return
		}
		if product.Stock < item.Quantity {
			writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", fmt.Sprintf("Insufficient stock for %s", product.Name))
			return
		}

		itemTotal := product.Price * float64(item.Quantity)
		subtotal += itemTotal

		var imgURL *string
		if len(product.Images) > 0 {
			imgURL = &product.Images[0].URL
		}

		pid := product.ID
		orderItems = append(orderItems, model.OrderItem{
			ProductID:    &pid,
			ProductName:  product.Name,
			ProductImage: imgURL,
			Price:        product.Price,
			Quantity:     item.Quantity,
			Total:        itemTotal,
		})
	}

	orderNumber := fmt.Sprintf("VS-%s-%s", time.Now().Format("20060102"), uuid.New().String()[:8])

	// Validate change_for if cash payment
	var changeFor *float64
	if req.PaymentMethod == "cash" && req.ChangeFor != nil {
		if *req.ChangeFor < subtotal {
			writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Change amount must be greater than or equal to order total")
			return
		}
		changeFor = req.ChangeFor
	}

	order := &model.Order{
		StoreID:         storeID,
		OrderNumber:     orderNumber,
		Status:          "pending",
		CustomerName:    req.CustomerName,
		CustomerEmail:   req.CustomerEmail,
		CustomerPhone:   req.CustomerPhone,
		ShippingAddress: req.ShippingAddress,
		ShippingCity:    req.ShippingCity,
		ShippingState:   req.ShippingState,
		ShippingZip:     req.ShippingZip,
		Subtotal:        subtotal,
		ShippingCost:    0,
		Discount:        0,
		Total:           subtotal,
		Notes:           req.Notes,
		DeliveryMethod:  req.DeliveryMethod,
		PaymentMethod:   req.PaymentMethod,
		ChangeFor:       changeFor,
		Items:           orderItems,
	}

	if err := h.orderRepo.Create(r.Context(), order); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create order")
		return
	}

	writeJSON(w, http.StatusCreated, order)
}

// GET /api/v1/store/orders/{orderNumber}
func (h *OrderHandler) GetByOrderNumber(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetStoreID(r.Context())
	orderNumber := r.URL.Query().Get("order_number")
	if orderNumber == "" {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Order number is required")
		return
	}

	order, err := h.orderRepo.FindByOrderNumber(r.Context(), orderNumber, storeID)
	if err != nil || order == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Order not found")
		return
	}

	writeJSON(w, http.StatusOK, order)
}

// GET /api/v1/admin/orders
func (h *OrderHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	page := queryInt(r, "page", 1)
	perPage := queryInt(r, "per_page", 20)
	status := r.URL.Query().Get("status")
	search := r.URL.Query().Get("search")

	orders, total, err := h.orderRepo.FindByStoreID(r.Context(), storeID, page, perPage, status, search)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list orders")
		return
	}
	if orders == nil {
		orders = []model.Order{}
	}

	writeJSON(w, http.StatusOK, dto.PaginatedResponse{
		Data:       orders,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: int(math.Ceil(float64(total) / float64(perPage))),
	})
}

// GET /api/v1/admin/orders/{id}
func (h *OrderHandler) AdminGet(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid order ID")
		return
	}

	order, err := h.orderRepo.FindByID(r.Context(), id, storeID)
	if err != nil || order == nil {
		writeError(w, http.StatusNotFound, "NOT_FOUND", "Order not found")
		return
	}

	writeJSON(w, http.StatusOK, order)
}

// PUT /api/v1/admin/orders/{id}/status
func (h *OrderHandler) AdminUpdateStatus(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())
	id, err := urlParamUint64(r, "id")
	if err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid order ID")
		return
	}

	var req dto.UpdateOrderStatusRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body")
		return
	}

	validStatuses := map[string]bool{
		"pending": true, "confirmed": true, "processing": true,
		"shipped": true, "delivered": true, "cancelled": true,
	}
	if !validStatuses[req.Status] {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid status")
		return
	}

	if err := h.orderRepo.UpdateStatus(r.Context(), id, storeID, req.Status); err != nil {
		writeError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update order status")
		return
	}

	order, _ := h.orderRepo.FindByID(r.Context(), id, storeID)
	writeJSON(w, http.StatusOK, order)
}
