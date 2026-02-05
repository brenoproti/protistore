package repository

import (
	"context"
	"database/sql"

	"github.com/vibestore/backend/internal/model"
)

type AdminRepository struct {
	db *sql.DB
}

func NewAdminRepository(db *sql.DB) *AdminRepository {
	return &AdminRepository{db: db}
}

func (r *AdminRepository) FindByEmail(ctx context.Context, email string) (*model.StoreAdmin, error) {
	var a model.StoreAdmin
	err := r.db.QueryRowContext(ctx,
		"SELECT id, store_id, name, email, password_hash, is_active, created_at, updated_at FROM store_admins WHERE email = ?",
		email,
	).Scan(&a.ID, &a.StoreID, &a.Name, &a.Email, &a.PasswordHash, &a.IsActive, &a.CreatedAt, &a.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *AdminRepository) FindByID(ctx context.Context, id uint64) (*model.StoreAdmin, error) {
	var a model.StoreAdmin
	err := r.db.QueryRowContext(ctx,
		"SELECT id, store_id, name, email, password_hash, is_active, created_at, updated_at FROM store_admins WHERE id = ?",
		id,
	).Scan(&a.ID, &a.StoreID, &a.Name, &a.Email, &a.PasswordHash, &a.IsActive, &a.CreatedAt, &a.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &a, nil
}
