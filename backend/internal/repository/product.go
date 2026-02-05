package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/vibestore/backend/internal/dto"
	"github.com/vibestore/backend/internal/model"
)

type ProductRepository struct {
	db *sql.DB
}

func NewProductRepository(db *sql.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) FindByStoreID(ctx context.Context, storeID uint64, params dto.ProductListParams) ([]model.Product, int64, error) {
	where := []string{"p.store_id = ?"}
	args := []interface{}{storeID}

	if params.Search != "" {
		where = append(where, "(p.name LIKE ? OR p.sku LIKE ?)")
		search := "%" + params.Search + "%"
		args = append(args, search, search)
	}
	if params.CategoryID != nil {
		where = append(where, "p.category_id = ?")
		args = append(args, *params.CategoryID)
	}
	if params.BrandID != nil {
		where = append(where, "p.brand_id = ?")
		args = append(args, *params.BrandID)
	}
	if params.MinPrice != nil {
		where = append(where, "p.price >= ?")
		args = append(args, *params.MinPrice)
	}
	if params.MaxPrice != nil {
		where = append(where, "p.price <= ?")
		args = append(args, *params.MaxPrice)
	}
	if params.Featured != nil {
		where = append(where, "p.is_featured = ?")
		args = append(args, *params.Featured)
	}
	if params.Active != nil {
		where = append(where, "p.is_active = ?")
		args = append(args, *params.Active)
	}

	whereClause := strings.Join(where, " AND ")

	// Count
	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM products p WHERE %s", whereClause)
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Sort
	sortCol := "p.created_at"
	switch params.Sort {
	case "name":
		sortCol = "p.name"
	case "price":
		sortCol = "p.price"
	case "created_at":
		sortCol = "p.created_at"
	case "stock":
		sortCol = "p.stock"
	}
	order := "DESC"
	if params.Order == "asc" {
		order = "ASC"
	}

	offset := (params.Page - 1) * params.PerPage
	query := fmt.Sprintf(
		`SELECT p.id, p.store_id, p.category_id, p.brand_id, p.name, p.slug, p.description,
		p.price, p.compare_at_price, p.cost_price, p.sku, p.stock, p.is_active, p.is_featured,
		p.created_at, p.updated_at
		FROM products p WHERE %s ORDER BY %s %s LIMIT ? OFFSET ?`,
		whereClause, sortCol, order)
	args = append(args, params.PerPage, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	products, err := scanProducts(rows)
	if err != nil {
		return nil, 0, err
	}

	// Load images for each product
	for i := range products {
		images, err := r.FindImagesByProductID(ctx, products[i].ID)
		if err != nil {
			return nil, 0, err
		}
		products[i].Images = images
	}

	return products, total, nil
}

func (r *ProductRepository) FindByID(ctx context.Context, id, storeID uint64) (*model.Product, error) {
	var p model.Product
	var catID, brandID sql.NullInt64
	var desc, sku sql.NullString
	var comparePrice, costPrice sql.NullFloat64

	err := r.db.QueryRowContext(ctx,
		`SELECT id, store_id, category_id, brand_id, name, slug, description,
		price, compare_at_price, cost_price, sku, stock, is_active, is_featured, created_at, updated_at
		FROM products WHERE id = ? AND store_id = ?`, id, storeID,
	).Scan(&p.ID, &p.StoreID, &catID, &brandID, &p.Name, &p.Slug, &desc,
		&p.Price, &comparePrice, &costPrice, &sku, &p.Stock, &p.IsActive, &p.IsFeatured, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p.CategoryID = model.NullInt64ToUint64Ptr(catID)
	p.BrandID = model.NullInt64ToUint64Ptr(brandID)
	p.Description = model.NullStringToPtr(desc)
	p.CompareAtPrice = model.NullFloat64ToPtr(comparePrice)
	p.CostPrice = model.NullFloat64ToPtr(costPrice)
	p.SKU = model.NullStringToPtr(sku)

	images, err := r.FindImagesByProductID(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	p.Images = images

	return &p, nil
}

func (r *ProductRepository) FindBySlug(ctx context.Context, slug string, storeID uint64) (*model.Product, error) {
	var p model.Product
	var catID, brandID sql.NullInt64
	var desc, sku sql.NullString
	var comparePrice, costPrice sql.NullFloat64

	err := r.db.QueryRowContext(ctx,
		`SELECT id, store_id, category_id, brand_id, name, slug, description,
		price, compare_at_price, cost_price, sku, stock, is_active, is_featured, created_at, updated_at
		FROM products WHERE slug = ? AND store_id = ?`, slug, storeID,
	).Scan(&p.ID, &p.StoreID, &catID, &brandID, &p.Name, &p.Slug, &desc,
		&p.Price, &comparePrice, &costPrice, &sku, &p.Stock, &p.IsActive, &p.IsFeatured, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	p.CategoryID = model.NullInt64ToUint64Ptr(catID)
	p.BrandID = model.NullInt64ToUint64Ptr(brandID)
	p.Description = model.NullStringToPtr(desc)
	p.CompareAtPrice = model.NullFloat64ToPtr(comparePrice)
	p.CostPrice = model.NullFloat64ToPtr(costPrice)
	p.SKU = model.NullStringToPtr(sku)

	images, err := r.FindImagesByProductID(ctx, p.ID)
	if err != nil {
		return nil, err
	}
	p.Images = images

	return &p, nil
}

func (r *ProductRepository) Create(ctx context.Context, p *model.Product) error {
	result, err := r.db.ExecContext(ctx,
		`INSERT INTO products (store_id, category_id, brand_id, name, slug, description,
		price, compare_at_price, cost_price, sku, stock, is_active, is_featured)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.StoreID, p.CategoryID, p.BrandID, p.Name, p.Slug, p.Description,
		p.Price, p.CompareAtPrice, p.CostPrice, p.SKU, p.Stock, p.IsActive, p.IsFeatured)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	p.ID = uint64(id)
	return nil
}

func (r *ProductRepository) Update(ctx context.Context, p *model.Product) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE products SET category_id = ?, brand_id = ?, name = ?, slug = ?, description = ?,
		price = ?, compare_at_price = ?, cost_price = ?, sku = ?, stock = ?, is_active = ?, is_featured = ?
		WHERE id = ? AND store_id = ?`,
		p.CategoryID, p.BrandID, p.Name, p.Slug, p.Description,
		p.Price, p.CompareAtPrice, p.CostPrice, p.SKU, p.Stock, p.IsActive, p.IsFeatured, p.ID, p.StoreID)
	return err
}

func (r *ProductRepository) Delete(ctx context.Context, id, storeID uint64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM products WHERE id = ? AND store_id = ?", id, storeID)
	return err
}

func (r *ProductRepository) FindImagesByProductID(ctx context.Context, productID uint64) ([]model.ProductImage, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, product_id, url, alt_text, sort_order, created_at FROM product_images WHERE product_id = ? ORDER BY sort_order",
		productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var images []model.ProductImage
	for rows.Next() {
		var img model.ProductImage
		var alt sql.NullString
		if err := rows.Scan(&img.ID, &img.ProductID, &img.URL, &alt, &img.SortOrder, &img.CreatedAt); err != nil {
			return nil, err
		}
		img.AltText = model.NullStringToPtr(alt)
		images = append(images, img)
	}
	return images, rows.Err()
}

func (r *ProductRepository) ReplaceImages(ctx context.Context, productID uint64, images []model.ProductImage) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM product_images WHERE product_id = ?", productID)
	if err != nil {
		return err
	}
	for _, img := range images {
		_, err := r.db.ExecContext(ctx,
			"INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)",
			productID, img.URL, img.AltText, img.SortOrder)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *ProductRepository) FindRelated(ctx context.Context, productID, storeID uint64, categoryID *uint64, limit int) ([]model.Product, error) {
	var rows *sql.Rows
	var err error
	if categoryID != nil {
		rows, err = r.db.QueryContext(ctx,
			`SELECT id, store_id, category_id, brand_id, name, slug, description,
			price, compare_at_price, cost_price, sku, stock, is_active, is_featured, created_at, updated_at
			FROM products WHERE store_id = ? AND is_active = TRUE AND id != ? AND category_id = ?
			ORDER BY RAND() LIMIT ?`, storeID, productID, *categoryID, limit)
	} else {
		rows, err = r.db.QueryContext(ctx,
			`SELECT id, store_id, category_id, brand_id, name, slug, description,
			price, compare_at_price, cost_price, sku, stock, is_active, is_featured, created_at, updated_at
			FROM products WHERE store_id = ? AND is_active = TRUE AND id != ?
			ORDER BY RAND() LIMIT ?`, storeID, productID, limit)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products, err := scanProducts(rows)
	if err != nil {
		return nil, err
	}
	for i := range products {
		images, _ := r.FindImagesByProductID(ctx, products[i].ID)
		products[i].Images = images
	}
	return products, nil
}

func scanProducts(rows *sql.Rows) ([]model.Product, error) {
	var products []model.Product
	for rows.Next() {
		var p model.Product
		var catID, brandID sql.NullInt64
		var desc, sku sql.NullString
		var comparePrice, costPrice sql.NullFloat64
		if err := rows.Scan(&p.ID, &p.StoreID, &catID, &brandID, &p.Name, &p.Slug, &desc,
			&p.Price, &comparePrice, &costPrice, &sku, &p.Stock, &p.IsActive, &p.IsFeatured,
			&p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		p.CategoryID = model.NullInt64ToUint64Ptr(catID)
		p.BrandID = model.NullInt64ToUint64Ptr(brandID)
		p.Description = model.NullStringToPtr(desc)
		p.CompareAtPrice = model.NullFloat64ToPtr(comparePrice)
		p.CostPrice = model.NullFloat64ToPtr(costPrice)
		p.SKU = model.NullStringToPtr(sku)
		products = append(products, p)
	}
	return products, rows.Err()
}
