package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/vibestore/backend/internal/model"
)

type OrderRepository struct {
	db *sql.DB
}

func NewOrderRepository(db *sql.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

func (r *OrderRepository) Create(ctx context.Context, o *model.Order) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx,
		`INSERT INTO orders (store_id, order_number, status, customer_name, customer_email, customer_phone,
		shipping_address, shipping_city, shipping_state, shipping_zip, subtotal, shipping_cost, discount, total, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		o.StoreID, o.OrderNumber, o.Status, o.CustomerName, o.CustomerEmail, o.CustomerPhone,
		o.ShippingAddress, o.ShippingCity, o.ShippingState, o.ShippingZip,
		o.Subtotal, o.ShippingCost, o.Discount, o.Total, o.Notes)
	if err != nil {
		return err
	}
	orderID, err := result.LastInsertId()
	if err != nil {
		return err
	}
	o.ID = uint64(orderID)

	for i := range o.Items {
		o.Items[i].OrderID = o.ID
		result, err := tx.ExecContext(ctx,
			`INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, total)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			o.Items[i].OrderID, o.Items[i].ProductID, o.Items[i].ProductName, o.Items[i].ProductImage,
			o.Items[i].Price, o.Items[i].Quantity, o.Items[i].Total)
		if err != nil {
			return err
		}
		itemID, _ := result.LastInsertId()
		o.Items[i].ID = uint64(itemID)

		// Decrease stock
		if o.Items[i].ProductID != nil {
			_, err = tx.ExecContext(ctx,
				"UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
				o.Items[i].Quantity, *o.Items[i].ProductID, o.Items[i].Quantity)
			if err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

func (r *OrderRepository) FindByStoreID(ctx context.Context, storeID uint64, page, perPage int, status, search string) ([]model.Order, int64, error) {
	where := []string{"o.store_id = ?"}
	args := []interface{}{storeID}

	if status != "" {
		where = append(where, "o.status = ?")
		args = append(args, status)
	}
	if search != "" {
		where = append(where, "(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_email LIKE ?)")
		s := "%" + search + "%"
		args = append(args, s, s, s)
	}

	whereClause := strings.Join(where, " AND ")

	var total int64
	if err := r.db.QueryRowContext(ctx, fmt.Sprintf("SELECT COUNT(*) FROM orders o WHERE %s", whereClause), args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * perPage
	query := fmt.Sprintf(
		`SELECT o.id, o.store_id, o.order_number, o.status, o.customer_name, o.customer_email, o.customer_phone,
		o.shipping_address, o.shipping_city, o.shipping_state, o.shipping_zip,
		o.subtotal, o.shipping_cost, o.discount, o.total, o.notes, o.created_at, o.updated_at
		FROM orders o WHERE %s ORDER BY o.created_at DESC LIMIT ? OFFSET ?`, whereClause)
	args = append(args, perPage, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	orders, err := scanOrders(rows)
	if err != nil {
		return nil, 0, err
	}

	return orders, total, nil
}

func (r *OrderRepository) FindByID(ctx context.Context, id, storeID uint64) (*model.Order, error) {
	var o model.Order
	var phone, notes sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, store_id, order_number, status, customer_name, customer_email, customer_phone,
		shipping_address, shipping_city, shipping_state, shipping_zip,
		subtotal, shipping_cost, discount, total, notes, created_at, updated_at
		FROM orders WHERE id = ? AND store_id = ?`, id, storeID,
	).Scan(&o.ID, &o.StoreID, &o.OrderNumber, &o.Status, &o.CustomerName, &o.CustomerEmail, &phone,
		&o.ShippingAddress, &o.ShippingCity, &o.ShippingState, &o.ShippingZip,
		&o.Subtotal, &o.ShippingCost, &o.Discount, &o.Total, &notes, &o.CreatedAt, &o.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	o.CustomerPhone = model.NullStringToPtr(phone)
	o.Notes = model.NullStringToPtr(notes)

	items, err := r.FindItemsByOrderID(ctx, o.ID)
	if err != nil {
		return nil, err
	}
	o.Items = items

	return &o, nil
}

func (r *OrderRepository) FindByOrderNumber(ctx context.Context, orderNumber string, storeID uint64) (*model.Order, error) {
	var o model.Order
	var phone, notes sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, store_id, order_number, status, customer_name, customer_email, customer_phone,
		shipping_address, shipping_city, shipping_state, shipping_zip,
		subtotal, shipping_cost, discount, total, notes, created_at, updated_at
		FROM orders WHERE order_number = ? AND store_id = ?`, orderNumber, storeID,
	).Scan(&o.ID, &o.StoreID, &o.OrderNumber, &o.Status, &o.CustomerName, &o.CustomerEmail, &phone,
		&o.ShippingAddress, &o.ShippingCity, &o.ShippingState, &o.ShippingZip,
		&o.Subtotal, &o.ShippingCost, &o.Discount, &o.Total, &notes, &o.CreatedAt, &o.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	o.CustomerPhone = model.NullStringToPtr(phone)
	o.Notes = model.NullStringToPtr(notes)

	items, err := r.FindItemsByOrderID(ctx, o.ID)
	if err != nil {
		return nil, err
	}
	o.Items = items

	return &o, nil
}

func (r *OrderRepository) UpdateStatus(ctx context.Context, id, storeID uint64, status string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE orders SET status = ? WHERE id = ? AND store_id = ?", status, id, storeID)
	return err
}

func (r *OrderRepository) FindItemsByOrderID(ctx context.Context, orderID uint64) ([]model.OrderItem, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, order_id, product_id, product_name, product_image, price, quantity, total, created_at
		FROM order_items WHERE order_id = ?`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []model.OrderItem
	for rows.Next() {
		var item model.OrderItem
		var productID sql.NullInt64
		var productImage sql.NullString
		if err := rows.Scan(&item.ID, &item.OrderID, &productID, &item.ProductName, &productImage,
			&item.Price, &item.Quantity, &item.Total, &item.CreatedAt); err != nil {
			return nil, err
		}
		item.ProductID = model.NullInt64ToUint64Ptr(productID)
		item.ProductImage = model.NullStringToPtr(productImage)
		items = append(items, item)
	}
	return items, rows.Err()
}

// Dashboard queries
func (r *OrderRepository) GetTotalOrders(ctx context.Context, storeID uint64) (int64, error) {
	var count int64
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM orders WHERE store_id = ?", storeID).Scan(&count)
	return count, err
}

func (r *OrderRepository) GetTotalRevenue(ctx context.Context, storeID uint64) (float64, error) {
	var revenue sql.NullFloat64
	err := r.db.QueryRowContext(ctx,
		"SELECT SUM(total) FROM orders WHERE store_id = ? AND status NOT IN ('cancelled')", storeID).Scan(&revenue)
	if err != nil {
		return 0, err
	}
	if revenue.Valid {
		return revenue.Float64, nil
	}
	return 0, nil
}

func (r *OrderRepository) GetTotalCustomers(ctx context.Context, storeID uint64) (int64, error) {
	var count int64
	err := r.db.QueryRowContext(ctx, "SELECT COUNT(DISTINCT customer_email) FROM orders WHERE store_id = ?", storeID).Scan(&count)
	return count, err
}

func (r *OrderRepository) GetOrdersByStatus(ctx context.Context, storeID uint64) (map[string]int64, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT status, COUNT(*) FROM orders WHERE store_id = ? GROUP BY status", storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]int64)
	for rows.Next() {
		var status string
		var count int64
		if err := rows.Scan(&status, &count); err != nil {
			return nil, err
		}
		result[status] = count
	}
	return result, rows.Err()
}

func (r *OrderRepository) GetTopProducts(ctx context.Context, storeID uint64, limit int) ([]struct {
	ID       uint64
	Name     string
	ImageURL *string
	Sold     int64
	Revenue  float64
}, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT oi.product_id, oi.product_name, oi.product_image, SUM(oi.quantity) as sold, SUM(oi.total) as revenue
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.store_id = ? AND o.status NOT IN ('cancelled') AND oi.product_id IS NOT NULL
		GROUP BY oi.product_id, oi.product_name, oi.product_image
		ORDER BY sold DESC LIMIT ?`, storeID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []struct {
		ID       uint64
		Name     string
		ImageURL *string
		Sold     int64
		Revenue  float64
	}
	for rows.Next() {
		var item struct {
			ID       uint64
			Name     string
			ImageURL *string
			Sold     int64
			Revenue  float64
		}
		var productID sql.NullInt64
		var img sql.NullString
		if err := rows.Scan(&productID, &item.Name, &img, &item.Sold, &item.Revenue); err != nil {
			return nil, err
		}
		if productID.Valid {
			item.ID = uint64(productID.Int64)
		}
		item.ImageURL = model.NullStringToPtr(img)
		result = append(result, item)
	}
	return result, rows.Err()
}

func (r *OrderRepository) GetChartData(ctx context.Context, storeID uint64, days int) ([]struct {
	Date    string
	Orders  int64
	Revenue float64
}, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT DATE(created_at) as date, COUNT(*) as orders, COALESCE(SUM(total), 0) as revenue
		FROM orders WHERE store_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) AND status NOT IN ('cancelled')
		GROUP BY DATE(created_at) ORDER BY date`, storeID, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []struct {
		Date    string
		Orders  int64
		Revenue float64
	}
	for rows.Next() {
		var item struct {
			Date    string
			Orders  int64
			Revenue float64
		}
		var date time.Time
		if err := rows.Scan(&date, &item.Orders, &item.Revenue); err != nil {
			return nil, err
		}
		item.Date = date.Format("2006-01-02")
		result = append(result, item)
	}
	return result, rows.Err()
}

func scanOrders(rows *sql.Rows) ([]model.Order, error) {
	var orders []model.Order
	for rows.Next() {
		var o model.Order
		var phone, notes sql.NullString
		if err := rows.Scan(&o.ID, &o.StoreID, &o.OrderNumber, &o.Status, &o.CustomerName, &o.CustomerEmail, &phone,
			&o.ShippingAddress, &o.ShippingCity, &o.ShippingState, &o.ShippingZip,
			&o.Subtotal, &o.ShippingCost, &o.Discount, &o.Total, &notes, &o.CreatedAt, &o.UpdatedAt); err != nil {
			return nil, err
		}
		o.CustomerPhone = model.NullStringToPtr(phone)
		o.Notes = model.NullStringToPtr(notes)
		orders = append(orders, o)
	}
	return orders, rows.Err()
}
