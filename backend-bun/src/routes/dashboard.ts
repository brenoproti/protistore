import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { authMiddleware } from "../middleware/auth";
import * as orderRepo from "../repositories/order";
import * as productRepo from "../repositories/product";
import type { DashboardMetrics } from "../types";

export const dashboardRoutes = new Elysia({ prefix: "/api/v1/admin" })
  .use(tenantMiddleware)
  .use(authMiddleware)
  .get("/dashboard", async ({ storeId }) => {
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalProducts,
      ordersByStatus,
      recentOrders,
      topProducts,
      chartData,
    ] = await Promise.all([
      orderRepo.getTotalOrders(storeId),
      orderRepo.getTotalRevenue(storeId),
      orderRepo.getTotalCustomers(storeId),
      productRepo.countProductsByStoreID(storeId),
      orderRepo.getOrdersByStatus(storeId),
      orderRepo.getRecentOrders(storeId, 5),
      orderRepo.getTopProducts(storeId, 5),
      orderRepo.getChartData(storeId, 30),
    ]);

    const metrics: DashboardMetrics = {
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_products: totalProducts,
      total_customers: totalCustomers,
      recent_orders: recentOrders,
      top_products: topProducts,
      chart_data: chartData,
      orders_by_status: ordersByStatus,
    };

    return metrics;
  });
