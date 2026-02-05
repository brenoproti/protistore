package repository

import (
	"context"
	"database/sql"

	"github.com/vibestore/backend/internal/model"
)

type CategoryRepository struct {
	db *sql.DB
}

func NewCategoryRepository(db *sql.DB) *CategoryRepository {
	return &CategoryRepository{db: db}
}

func (r *CategoryRepository) FindByStoreID(ctx context.Context, storeID uint64) ([]model.Category, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, store_id, parent_id, name, slug, description, image_url, sort_order, is_active, created_at, updated_at
		FROM categories WHERE store_id = ? ORDER BY sort_order, name`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanCategories(rows)
}

func (r *CategoryRepository) FindActiveByStoreID(ctx context.Context, storeID uint64) ([]model.Category, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, store_id, parent_id, name, slug, description, image_url, sort_order, is_active, created_at, updated_at
		FROM categories WHERE store_id = ? AND is_active = TRUE ORDER BY sort_order, name`, storeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanCategories(rows)
}

func (r *CategoryRepository) FindByID(ctx context.Context, id, storeID uint64) (*model.Category, error) {
	var c model.Category
	var parentID sql.NullInt64
	var desc, img sql.NullString
	err := r.db.QueryRowContext(ctx,
		`SELECT id, store_id, parent_id, name, slug, description, image_url, sort_order, is_active, created_at, updated_at
		FROM categories WHERE id = ? AND store_id = ?`, id, storeID,
	).Scan(&c.ID, &c.StoreID, &parentID, &c.Name, &c.Slug, &desc, &img, &c.SortOrder, &c.IsActive, &c.CreatedAt, &c.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	c.ParentID = model.NullInt64ToUint64Ptr(parentID)
	c.Description = model.NullStringToPtr(desc)
	c.ImageURL = model.NullStringToPtr(img)
	return &c, nil
}

func (r *CategoryRepository) Create(ctx context.Context, c *model.Category) error {
	result, err := r.db.ExecContext(ctx,
		`INSERT INTO categories (store_id, parent_id, name, slug, description, image_url, sort_order, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		c.StoreID, c.ParentID, c.Name, c.Slug, c.Description, c.ImageURL, c.SortOrder, c.IsActive)
	if err != nil {
		return err
	}
	id, err := result.LastInsertId()
	if err != nil {
		return err
	}
	c.ID = uint64(id)
	return nil
}

func (r *CategoryRepository) Update(ctx context.Context, c *model.Category) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE categories SET parent_id = ?, name = ?, slug = ?, description = ?, image_url = ?, sort_order = ?, is_active = ?
		WHERE id = ? AND store_id = ?`,
		c.ParentID, c.Name, c.Slug, c.Description, c.ImageURL, c.SortOrder, c.IsActive, c.ID, c.StoreID)
	return err
}

func (r *CategoryRepository) Delete(ctx context.Context, id, storeID uint64) error {
	_, err := r.db.ExecContext(ctx, "DELETE FROM categories WHERE id = ? AND store_id = ?", id, storeID)
	return err
}

func scanCategories(rows *sql.Rows) ([]model.Category, error) {
	var categories []model.Category
	for rows.Next() {
		var c model.Category
		var parentID sql.NullInt64
		var desc, img sql.NullString
		if err := rows.Scan(&c.ID, &c.StoreID, &parentID, &c.Name, &c.Slug, &desc, &img, &c.SortOrder, &c.IsActive, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		c.ParentID = model.NullInt64ToUint64Ptr(parentID)
		c.Description = model.NullStringToPtr(desc)
		c.ImageURL = model.NullStringToPtr(img)
		categories = append(categories, c)
	}
	return categories, rows.Err()
}

func BuildCategoryTree(categories []model.Category) []model.Category {
	byID := make(map[uint64]*model.Category)
	for i := range categories {
		categories[i].Children = []model.Category{}
		byID[categories[i].ID] = &categories[i]
	}
	var roots []model.Category
	for i := range categories {
		if categories[i].ParentID != nil {
			if parent, ok := byID[*categories[i].ParentID]; ok {
				parent.Children = append(parent.Children, categories[i])
				continue
			}
		}
		roots = append(roots, categories[i])
	}
	// Update children in roots from the map
	for i := range roots {
		if p, ok := byID[roots[i].ID]; ok {
			roots[i].Children = p.Children
		}
	}
	return roots
}
