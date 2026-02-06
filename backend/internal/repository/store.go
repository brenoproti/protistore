package repository

import (
	"context"
	"database/sql"

	"github.com/vibestore/backend/internal/model"
)

type StoreRepository struct {
	db *sql.DB
}

func NewStoreRepository(db *sql.DB) *StoreRepository {
	return &StoreRepository{db: db}
}

func (r *StoreRepository) FindBySlug(ctx context.Context, slug string) (*model.Store, error) {
	var s model.Store
	var desc, logo, favicon, whatsapp sql.NullString
	err := r.db.QueryRowContext(ctx,
		"SELECT id, name, slug, description, logo_url, favicon_url, whatsapp_number, is_active, created_at, updated_at FROM stores WHERE slug = ?",
		slug,
	).Scan(&s.ID, &s.Name, &s.Slug, &desc, &logo, &favicon, &whatsapp, &s.IsActive, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	s.Description = model.NullStringToPtr(desc)
	s.LogoURL = model.NullStringToPtr(logo)
	s.FaviconURL = model.NullStringToPtr(favicon)
	s.WhatsappNumber = model.NullStringToPtr(whatsapp)
	return &s, nil
}

func (r *StoreRepository) FindByID(ctx context.Context, id uint64) (*model.Store, error) {
	var s model.Store
	var desc, logo, favicon, whatsapp sql.NullString
	err := r.db.QueryRowContext(ctx,
		"SELECT id, name, slug, description, logo_url, favicon_url, whatsapp_number, is_active, created_at, updated_at FROM stores WHERE id = ?",
		id,
	).Scan(&s.ID, &s.Name, &s.Slug, &desc, &logo, &favicon, &whatsapp, &s.IsActive, &s.CreatedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	s.Description = model.NullStringToPtr(desc)
	s.LogoURL = model.NullStringToPtr(logo)
	s.FaviconURL = model.NullStringToPtr(favicon)
	s.WhatsappNumber = model.NullStringToPtr(whatsapp)
	return &s, nil
}

func (r *StoreRepository) ListActive(ctx context.Context) ([]model.Store, error) {
	rows, err := r.db.QueryContext(ctx,
		"SELECT id, name, slug, description, logo_url, favicon_url, whatsapp_number, is_active, created_at, updated_at FROM stores WHERE is_active = 1 ORDER BY name")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var stores []model.Store
	for rows.Next() {
		var s model.Store
		var desc, logo, favicon, whatsapp sql.NullString
		if err := rows.Scan(&s.ID, &s.Name, &s.Slug, &desc, &logo, &favicon, &whatsapp, &s.IsActive, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		s.Description = model.NullStringToPtr(desc)
		s.LogoURL = model.NullStringToPtr(logo)
		s.FaviconURL = model.NullStringToPtr(favicon)
		s.WhatsappNumber = model.NullStringToPtr(whatsapp)
		stores = append(stores, s)
	}
	return stores, rows.Err()
}

func (r *StoreRepository) Update(ctx context.Context, s *model.Store) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE stores SET name = ?, description = ?, logo_url = ?, favicon_url = ?, whatsapp_number = ? WHERE id = ?",
		s.Name, s.Description, s.LogoURL, s.FaviconURL, s.WhatsappNumber, s.ID,
	)
	return err
}

func (r *StoreRepository) GetCustomization(ctx context.Context, storeID uint64) (*model.StoreCustomization, error) {
	var c model.StoreCustomization
	var customCSS sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, store_id, primary_color, secondary_color, accent_color, background_color,
		text_color, header_bg_color, footer_bg_color, font_family, border_radius, custom_css, created_at, updated_at
		FROM store_customizations WHERE store_id = ?`,
		storeID,
	).Scan(&c.ID, &c.StoreID, &c.PrimaryColor, &c.SecondaryColor, &c.AccentColor, &c.BackgroundColor,
		&c.TextColor, &c.HeaderBgColor, &c.FooterBgColor, &c.FontFamily, &c.BorderRadius, &customCSS, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	c.CustomCSS = model.NullStringToPtr(customCSS)
	return &c, nil
}

func (r *StoreRepository) UpsertCustomization(ctx context.Context, c *model.StoreCustomization) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO store_customizations (store_id, primary_color, secondary_color, accent_color, background_color,
		text_color, header_bg_color, footer_bg_color, font_family, border_radius, custom_css)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE primary_color=VALUES(primary_color), secondary_color=VALUES(secondary_color),
		accent_color=VALUES(accent_color), background_color=VALUES(background_color), text_color=VALUES(text_color),
		header_bg_color=VALUES(header_bg_color), footer_bg_color=VALUES(footer_bg_color), font_family=VALUES(font_family),
		border_radius=VALUES(border_radius), custom_css=VALUES(custom_css)`,
		c.StoreID, c.PrimaryColor, c.SecondaryColor, c.AccentColor, c.BackgroundColor,
		c.TextColor, c.HeaderBgColor, c.FooterBgColor, c.FontFamily, c.BorderRadius, c.CustomCSS,
	)
	return err
}
