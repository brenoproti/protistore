import { getPool, type RowDataPacket, type ResultSetHeader } from "../db";
import type { Order, OrderItem, DashboardOrder, TopProduct, ChartDataPoint } from "../types";

export async function createOrder(order: Partial<Order>, items: { product_id: number; product_name: string; product_image: string | null; price: number; quantity: number }[]): Promise<number> {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO orders (store_id, order_number, status, customer_name, customer_email, customer_phone,
       shipping_address, shipping_city, shipping_state, shipping_zip,
       subtotal, shipping_cost, discount, total, notes, delivery_method, payment_method, change_for)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.store_id, order.order_number, order.status || "pending",
        order.customer_name, order.customer_email, order.customer_phone ?? null,
        order.shipping_address, order.shipping_city, order.shipping_state, order.shipping_zip,
        order.subtotal, order.shipping_cost ?? 0, order.discount ?? 0, order.total,
        order.notes ?? null, order.delivery_method ?? "delivery", order.payment_method ?? "pix",
        order.change_for ?? null,
      ]
    );
    const orderId = result.insertId;

    for (const item of items) {
      const itemTotal = Math.round(item.price * item.quantity * 100) / 100;
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.product_name, item.product_image, item.price, item.quantity, itemTotal]
      );

      // Decrement stock
      const [stockResult] = await conn.query<ResultSetHeader>(
        `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
        [item.quantity, item.product_id, item.quantity]
      );
      if (stockResult.affectedRows === 0) {
        throw new Error(`Insufficient stock for product: ${item.product_name}`);
      }
    }

    await conn.commit();
    return orderId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function findOrdersByStoreID(
  storeId: number,
  page: number,
  perPage: number,
  status?: string,
  search?: string
): Promise<{ orders: Order[]; total: number }> {
  let where = "WHERE store_id = ?";
  const args: unknown[] = [storeId];

  if (status) {
    where += " AND status = ?";
    args.push(status);
  }
  if (search) {
    where += " AND (order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)";
    const like = `%${search}%`;
    args.push(like, like, like);
  }

  const [countRows] = await getPool().query<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM orders ${where}`,
    args
  );
  const total = (countRows[0] as { total: number }).total;

  const offset = (page - 1) * perPage;
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...args, perPage, offset]
  );

  return { orders: rows as Order[], total };
}

export async function findOrderByID(id: number, storeId: number): Promise<Order | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM orders WHERE id = ? AND store_id = ?",
    [id, storeId]
  );
  const order = (rows[0] as Order) ?? null;
  if (order) {
    order.items = await findItemsByOrderID(order.id);
  }
  return order;
}

export async function findOrderByOrderNumber(orderNumber: string, storeId: number): Promise<Order | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM orders WHERE order_number = ? AND store_id = ?",
    [orderNumber, storeId]
  );
  const order = (rows[0] as Order) ?? null;
  if (order) {
    order.items = await findItemsByOrderID(order.id);
  }
  return order;
}

export async function updateOrderStatus(id: number, storeId: number, status: string): Promise<void> {
  await getPool().query<ResultSetHeader>(
    "UPDATE orders SET status = ? WHERE id = ? AND store_id = ?",
    [status, id, storeId]
  );
}

export async function findItemsByOrderID(orderId: number): Promise<OrderItem[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM order_items WHERE order_id = ?",
    [orderId]
  );
  return rows as OrderItem[];
}

// Dashboard queries
export async function getTotalOrders(storeId: number): Promise<number> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT COUNT(*) as total FROM orders WHERE store_id = ?",
    [storeId]
  );
  return (rows[0] as { total: number }).total;
}

export async function getTotalRevenue(storeId: number): Promise<number> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE store_id = ? AND status != 'cancelled'",
    [storeId]
  );
  return Number((rows[0] as { total: number }).total);
}

export async function getTotalCustomers(storeId: number): Promise<number> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT COUNT(DISTINCT customer_email) as total FROM orders WHERE store_id = ?",
    [storeId]
  );
  return (rows[0] as { total: number }).total;
}

export async function getOrdersByStatus(storeId: number): Promise<Record<string, number>> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT status, COUNT(*) as count FROM orders WHERE store_id = ? GROUP BY status",
    [storeId]
  );
  const result: Record<string, number> = {};
  for (const row of rows as { status: string; count: number }[]) {
    result[row.status] = row.count;
  }
  return result;
}

export async function getRecentOrders(storeId: number, limit: number): Promise<DashboardOrder[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT id, order_number, customer_name as customer, total, status, created_at
     FROM orders WHERE store_id = ? ORDER BY created_at DESC LIMIT ?`,
    [storeId, limit]
  );
  return rows as DashboardOrder[];
}

export async function getTopProducts(storeId: number, limit: number): Promise<TopProduct[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT oi.product_id as id, oi.product_name as name, oi.product_image as image_url,
     SUM(oi.quantity) as sold, SUM(oi.total) as revenue
     FROM order_items oi
     JOIN orders o ON o.id = oi.order_id
     WHERE o.store_id = ? AND o.status != 'cancelled'
     GROUP BY oi.product_id, oi.product_name, oi.product_image
     ORDER BY sold DESC LIMIT ?`,
    [storeId, limit]
  );
  return (rows as TopProduct[]).map((r) => ({
    ...r,
    sold: Number(r.sold),
    revenue: Number(r.revenue),
  }));
}

export async function getChartData(storeId: number, days: number): Promise<ChartDataPoint[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
     FROM orders WHERE store_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND status != 'cancelled'
     GROUP BY DATE(created_at) ORDER BY date`,
    [storeId, days]
  );
  return (rows as ChartDataPoint[]).map((r) => ({
    date: typeof r.date === "string" ? r.date : new Date(r.date).toISOString().split("T")[0],
    orders: Number(r.orders),
    revenue: Number(r.revenue),
  }));
}
