package repository

import (
	"context"
	"database/sql"

	"github.com/vibestore/backend/internal/model"
)

type BrandRepository struct {
	db *sql.DB
}

func NewBrandRepository(db *sql.DB) *BrandRepository {
	return &BrandRepository{db: db}
}

func (r *BrandRepository) FindByStoreID(ctx context.Context, storeID uint64) ([]model.Brand, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, store_id, name, slug, logo_url, is_active, created_at, updated_at
		FROM brands WHERE store_id = ? ORDER BY name`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBrands(rows)
}

func (r *BrandRepository) FindActiveByStoreID(ctx context.Context, storeID uint64) ([]model.Brand, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, store_id, name, slug, logo_url, is_active, created_at, updated_at
		FROM brands WHERE store_id = ? AND is_active = TRUE ORDER BY name`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBrands(rows)
}

func (r *BrandRepository) FindByName(ctx context.Context, storeID uint64, name string) (*model.Brand, error) {
	var b model.Brand
	var logo sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, store_id, name, slug, logo_url, is_active, created_at, updated_at
		FROM brands WHERE store_id = ? AND LOWER(name) = LOWER(?) LIMIT 1`, storeID, name,
	).Scan(&b.ID, &b.StoreID, &b.Name, &b.Slug, &logo, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	b.LogoURL = model.NullStringToPtr(logo)
	return &b, nil
}

func (r *BrandRepository) FindByID(ctx context.Context, id, storeID uint64) (*model.Brand, error) {
	var b model.Brand
	var logo sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, store_id, name, slug, logo_url, is_active, created_at, updated_at
		FROM brands WHERE id = ? AND store_id = ?`, id, storeID,
	).Scan(&b.ID, &b.StoreID, &b.Name, &b.Slug, &logo, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	b.LogoURL = model.NullStringToPtr(logo)
	return &b, nil
}

func (r *BrandRepository) Create(ctx context.Context, b *model.Brand) error {
	result, err := r.db.ExecContext(ctx,
		`INSERT INTO brands (store_id, name, slug, logo_url, is_active) VALUES (?, ?, ?, ?, ?)`,
		b.StoreID, b.Name, b.Slug, b.LogoURL, b.IsActive)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	b.ID = uint64(id)
	return nil
}

func (r *BrandRepository) Update(ctx context.Context, b *model.Brand) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE brands SET name = ?, slug = ?, logo_url = ?, is_active = ? WHERE id = ? AND store_id = ?`,
		b.Name, b.Slug, b.LogoURL, b.IsActive, b.ID, b.StoreID)
	return err
}

func (r *BrandRepository) Delete(ctx context.Context, id, storeID uint64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM brands WHERE id = ? AND store_id = ?", id, storeID)
	return err
}

func scanBrands(rows *sql.Rows) ([]model.Brand, error) {
	var brands []model.Brand
	for rows.Next() {
		var b model.Brand
		var logo sql.NullString
		if err := rows.Scan(&b.ID, &b.StoreID, &b.Name, &b.Slug, &logo, &b.IsActive, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		b.LogoURL = model.NullStringToPtr(logo)
		brands = append(brands, b)
	}
	return brands, rows.Err()
}
