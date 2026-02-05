package repository

import (
	"context"
	"database/sql"

	"github.com/vibestore/backend/internal/model"
)

type BannerRepository struct {
	db *sql.DB
}

func NewBannerRepository(db *sql.DB) *BannerRepository {
	return &BannerRepository{db: db}
}

func (r *BannerRepository) FindByStoreID(ctx context.Context, storeID uint64) ([]model.Banner, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, store_id, title, subtitle, image_url, link_url, sort_order, is_active, created_at, updated_at
		FROM banners WHERE store_id = ? ORDER BY sort_order`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBanners(rows)
}

func (r *BannerRepository) FindActiveByStoreID(ctx context.Context, storeID uint64) ([]model.Banner, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, store_id, title, subtitle, image_url, link_url, sort_order, is_active, created_at, updated_at
		FROM banners WHERE store_id = ? AND is_active = TRUE ORDER BY sort_order`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanBanners(rows)
}

func (r *BannerRepository) FindByID(ctx context.Context, id, storeID uint64) (*model.Banner, error) {
	var b model.Banner
	var subtitle, linkURL sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, store_id, title, subtitle, image_url, link_url, sort_order, is_active, created_at, updated_at
		FROM banners WHERE id = ? AND store_id = ?`, id, storeID,
	).Scan(&b.ID, &b.StoreID, &b.Title, &subtitle, &b.ImageURL, &linkURL, &b.SortOrder, &b.IsActive, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	b.Subtitle = model.NullStringToPtr(subtitle)
	b.LinkURL = model.NullStringToPtr(linkURL)
	return &b, nil
}

func (r *BannerRepository) Create(ctx context.Context, b *model.Banner) error {
	result, err := r.db.ExecContext(ctx,
		`INSERT INTO banners (store_id, title, subtitle, image_url, link_url, sort_order, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		b.StoreID, b.Title, b.Subtitle, b.ImageURL, b.LinkURL, b.SortOrder, b.IsActive)
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

func (r *BannerRepository) Update(ctx context.Context, b *model.Banner) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE banners SET title = ?, subtitle = ?, image_url = ?, link_url = ?, sort_order = ?, is_active = ?
		WHERE id = ? AND store_id = ?`,
		b.Title, b.Subtitle, b.ImageURL, b.LinkURL, b.SortOrder, b.IsActive, b.ID, b.StoreID)
	return err
}

func (r *BannerRepository) Delete(ctx context.Context, id, storeID uint64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM banners WHERE id = ? AND store_id = ?", id, storeID)
	return err
}

func scanBanners(rows *sql.Rows) ([]model.Banner, error) {
	var banners []model.Banner
	for rows.Next() {
		var b model.Banner
		var subtitle, linkURL sql.NullString
		if err := rows.Scan(&b.ID, &b.StoreID, &b.Title, &subtitle, &b.ImageURL, &linkURL, &b.SortOrder, &b.IsActive, &b.CreatedAt, &b.UpdatedAt); err != nil {
			return nil, err
		}
		b.Subtitle = model.NullStringToPtr(subtitle)
		b.LinkURL = model.NullStringToPtr(linkURL)
		banners = append(banners, b)
	}
	return banners, rows.Err()
}
