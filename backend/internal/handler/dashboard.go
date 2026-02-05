package handler

import (
	"net/http"

	"github.com/vibestore/backend/internal/dto"
	"github.com/vibestore/backend/internal/middleware"
	"github.com/vibestore/backend/internal/repository"
)

type DashboardHandler struct {
	orderRepo   *repository.OrderRepository
	productRepo *repository.ProductRepository
}

func NewDashboardHandler(orderRepo *repository.OrderRepository, productRepo *repository.ProductRepository) *DashboardHandler {
	return &DashboardHandler{orderRepo: orderRepo, productRepo: productRepo}
}

// GET /api/v1/admin/dashboard
func (h *DashboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	storeID := middleware.GetAdminStoreID(r.Context())

	totalOrders, _ := h.orderRepo.GetTotalOrders(r.Context(), storeID)
	totalRevenue, _ := h.orderRepo.GetTotalRevenue(r.Context(), storeID)
	totalCustomers, _ := h.orderRepo.GetTotalCustomers(r.Context(), storeID)

	// Total products
	active := true
	_, totalProducts, _ := h.productRepo.FindByStoreID(r.Context(), storeID, dto.ProductListParams{
		Page: 1, PerPage: 1, Active: &active,
	})

	// Recent orders
	recentOrdersRaw, _, _ := h.orderRepo.FindByStoreID(r.Context(), storeID, 1, 5, "", "")
	var recentOrders []dto.DashboardOrder
	for _, o := range recentOrdersRaw {
		recentOrders = append(recentOrders, dto.DashboardOrder{
			ID:          o.ID,
			OrderNumber: o.OrderNumber,
			Customer:    o.CustomerName,
			Total:       o.Total,
			Status:      o.Status,
			CreatedAt:   o.CreatedAt.Format("2006-01-02 15:04"),
		})
	}
	if recentOrders == nil {
		recentOrders = []dto.DashboardOrder{}
	}

	// Top products
	topProductsRaw, _ := h.orderRepo.GetTopProducts(r.Context(), storeID, 5)
	var topProducts []dto.TopProduct
	for _, p := range topProductsRaw {
		topProducts = append(topProducts, dto.TopProduct{
			ID:       p.ID,
			Name:     p.Name,
			ImageURL: p.ImageURL,
			Sold:     p.Sold,
			Revenue:  p.Revenue,
		})
	}
	if topProducts == nil {
		topProducts = []dto.TopProduct{}
	}

	// Chart data (30 days)
	chartDataRaw, _ := h.orderRepo.GetChartData(r.Context(), storeID, 30)
	var chartData []dto.ChartDataPoint
	for _, d := range chartDataRaw {
		chartData = append(chartData, dto.ChartDataPoint{
			Date:    d.Date,
			Orders:  d.Orders,
			Revenue: d.Revenue,
		})
	}
	if chartData == nil {
		chartData = []dto.ChartDataPoint{}
	}

	// Orders by status
	ordersByStatus, _ := h.orderRepo.GetOrdersByStatus(r.Context(), storeID)
	if ordersByStatus == nil {
		ordersByStatus = map[string]int64{}
	}

	writeJSON(w, http.StatusOK, dto.DashboardMetrics{
		TotalOrders:    totalOrders,
		TotalRevenue:   totalRevenue,
		TotalProducts:  totalProducts,
		TotalCustomers: totalCustomers,
		RecentOrders:   recentOrders,
		TopProducts:    topProducts,
		ChartData:      chartData,
		OrdersByStatus: ordersByStatus,
	})
}
