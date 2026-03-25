import Elysia from "elysia";
import { tenantMiddleware } from "../middleware/tenant";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import * as orderRepo from "../repositories/order";
import * as productRepo from "../repositories/product";
import * as storeRepo from "../repositories/store";
import * as adminRepo from "../repositories/admin";
import { sendOrderConfirmation, sendStatusUpdate, notifyStoreNewOrder } from "../services/email";
import { logger } from "../logger";
import type { CartValidationRequest, CheckoutRequest, UpdateOrderStatusRequest, CartValidatedItem } from "../types";

export const publicOrderRoutes = new Elysia({ prefix: "/api/v1" })
  .use(tenantMiddleware)
  .use(rateLimit({ name: "checkout", max: 5, windowSec: 60 }))
  .post("/store/cart", async ({ body, storeId }) => {
    const req = body as CartValidationRequest;
    const items: CartValidatedItem[] = [];
    let valid = true;

    for (const cartItem of req.items) {
      const product = await productRepo.findProductByID(cartItem.product_id, storeId);
      if (!product) {
        items.push({
          product_id: cartItem.product_id,
          product_name: "Unknown",
          product_image: null,
          price: 0,
          quantity: cartItem.quantity,
          stock: 0,
          available: false,
        });
        valid = false;
        continue;
      }

      const available = product.is_active && product.stock >= cartItem.quantity;
      if (!available) valid = false;

      items.push({
        product_id: product.id,
        product_name: product.name,
        product_image: product.images && product.images.length > 0 ? product.images[0].url : null,
        price: product.price,
        quantity: cartItem.quantity,
        stock: product.stock,
        available,
      });
    }

    return { items, valid };
  })
  .post("/store/orders", async ({ body, storeId, set }) => {
    const req = body as CheckoutRequest;

    // Validate required fields
    if (!req.customer_name || !req.customer_email || !req.items || req.items.length === 0) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "customer_name, customer_email, and items are required" };
    }

    // LGPD: require explicit privacy consent
    if (!req.privacy_accepted) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Aceite da Política de Privacidade é obrigatório" };
    }

    // Validate delivery/payment methods
    const validDelivery = ["pickup", "delivery"];
    const validPayment = ["credit_card", "debit_card", "cash", "pix", "pay_on_pickup"];
    let deliveryMethod = req.delivery_method || "delivery";
    let paymentMethod = req.payment_method || "pix";

    if (!validDelivery.includes(deliveryMethod)) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Invalid delivery method" };
    }
    if (!validPayment.includes(paymentMethod)) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Invalid payment method" };
    }

    // Pickup forces pay_on_pickup
    if (deliveryMethod === "pickup") {
      paymentMethod = "pay_on_pickup";
    }

    // Delivery requires shipping fields
    if (deliveryMethod === "delivery") {
      if (!req.shipping_address || !req.shipping_city || !req.shipping_state || !req.shipping_zip) {
        set.status = 400;
        return { code: "VALIDATION_ERROR", message: "Shipping address is required for delivery" };
      }
    }

    // Validate stock and build order items
    let subtotal = 0;
    const orderItems: { product_id: number; product_name: string; product_image: string | null; price: number; quantity: number }[] = [];

    for (const cartItem of req.items) {
      const product = await productRepo.findProductByID(cartItem.product_id, storeId);
      if (!product) {
        set.status = 400;
        return { code: "VALIDATION_ERROR", message: `Product ${cartItem.product_id} not found` };
      }
      if (product.stock < cartItem.quantity) {
        set.status = 400;
        return { code: "VALIDATION_ERROR", message: `Insufficient stock for ${product.name}` };
      }

      const imgUrl = product.images && product.images.length > 0 ? product.images[0].url : null;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image: imgUrl,
        price: product.price,
        quantity: cartItem.quantity,
      });
      subtotal += product.price * cartItem.quantity;
    }

    subtotal = Math.round(subtotal * 100) / 100;
    const total = subtotal; // No shipping cost or discount from client

    // Validate change_for
    if (paymentMethod === "cash" && req.change_for !== undefined && req.change_for !== null) {
      if (req.change_for < subtotal) {
        set.status = 400;
        return { code: "VALIDATION_ERROR", message: "Change amount must be >= subtotal" };
      }
    }

    // Generate order number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const uuid8 = crypto.randomUUID().slice(0, 8);
    const orderNumber = `PS-${dateStr}-${uuid8}`;

    try {
      const orderId = await orderRepo.createOrder(
        {
          store_id: storeId,
          order_number: orderNumber,
          status: "pending",
          customer_name: req.customer_name,
          customer_email: req.customer_email,
          customer_phone: req.customer_phone ?? null,
          shipping_address: req.shipping_address || "",
          shipping_city: req.shipping_city || "",
          shipping_state: req.shipping_state || "",
          shipping_zip: req.shipping_zip || "",
          subtotal,
          shipping_cost: 0,
          discount: 0,
          total,
          notes: req.notes ?? null,
          delivery_method: deliveryMethod,
          payment_method: paymentMethod,
          change_for: req.change_for ?? null,
        },
        orderItems
      );

      const order = await orderRepo.findOrderByID(orderId, storeId);
      set.status = 201;

      // Send emails (fire-and-forget, parallel)
      if (order) {
        Promise.all([
          storeRepo.findStoreByID(storeId),
          adminRepo.findAdminEmailsByStoreID(storeId),
        ]).then(([store, adminEmails]) => {
          const storeName = store?.name ?? "ProtiStore";
          sendOrderConfirmation(order, storeName).catch(() => {});
          notifyStoreNewOrder(order, storeName, adminEmails).catch(() => {});
        }).catch(() => {});
      }

      return order;
    } catch (err: unknown) {
      logger.error(err, "Failed to create order");
      set.status = 500;
      return { code: "INTERNAL_ERROR", message: "Erro ao criar pedido. Tente novamente." };
    }
  })
  .get("/store/orders", async ({ query, storeId, set }) => {
    const orderNumber = query.order_number as string;
    if (!orderNumber) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "order_number query parameter is required" };
    }
    const order = await orderRepo.findOrderByOrderNumber(orderNumber, storeId);
    if (!order) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Order not found" };
    }
    // Public tracking: return only non-sensitive fields
    return {
      order_number: order.order_number,
      status: order.status,
      delivery_method: order.delivery_method,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  });

export const adminOrderRoutes = new Elysia({ prefix: "/api/v1/admin" })
  .use(tenantMiddleware)
  .use(authMiddleware)
  .get("/orders", async ({ query, storeId }) => {
    const page = Number(query.page) || 1;
    const perPage = Number(query.per_page) || 20;
    const status = (query.status as string) || undefined;
    const search = (query.search as string) || undefined;

    const { orders, total } = await orderRepo.findOrdersByStoreID(storeId, page, perPage, status, search);
    return {
      data: orders,
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    };
  })
  .get("/orders/:id", async ({ params, storeId, set }) => {
    const order = await orderRepo.findOrderByID(Number(params.id), storeId);
    if (!order) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Order not found" };
    }
    return order;
  })
  .put("/orders/:id/status", async ({ params, body, storeId, set }) => {
    const req = body as UpdateOrderStatusRequest;
    const validStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(req.status)) {
      set.status = 400;
      return { code: "VALIDATION_ERROR", message: "Invalid status" };
    }

    const order = await orderRepo.findOrderByID(Number(params.id), storeId);
    if (!order) {
      set.status = 404;
      return { code: "NOT_FOUND", message: "Order not found" };
    }

    await orderRepo.updateOrderStatus(order.id, storeId, req.status);
    const updated = await orderRepo.findOrderByID(order.id, storeId);

    // Send status update email (fire-and-forget)
    if (updated) {
      const store = await storeRepo.findStoreByID(storeId);
      sendStatusUpdate(updated, store?.name ?? "ProtiStore").catch(() => {});
    }

    return updated;
  });
