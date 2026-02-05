package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/vibestore/backend/internal/repository"
)

type contextKey string

const StoreIDKey contextKey = "store_id"
const StoreSlugKey contextKey = "store_slug"

func GetStoreID(ctx context.Context) uint64 {
	if v, ok := ctx.Value(StoreIDKey).(uint64); ok {
		return v
	}
	return 0
}

func TenantMiddleware(storeRepo *repository.StoreRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			host := r.Host

			// Remove port if present
			if idx := strings.LastIndex(host, ":"); idx != -1 {
				host = host[:idx]
			}

			// Extract subdomain: e.g., "mystore.vibestore.localhost" → "mystore"
			// Also handle direct slug via X-Store-Slug header for development
			var slug string
			if headerSlug := r.Header.Get("X-Store-Slug"); headerSlug != "" {
				slug = headerSlug
			} else {
				parts := strings.Split(host, ".")
				if len(parts) >= 2 {
					slug = parts[0]
				} else {
					// Fallback: use "localhost" case - check for default store
					slug = parts[0]
				}
			}

			if slug == "" {
				http.Error(w, `{"code":"STORE_NOT_FOUND","message":"Could not determine store"}`, http.StatusNotFound)
				return
			}

			store, err := storeRepo.FindBySlug(r.Context(), slug)
			if err != nil || store == nil || !store.IsActive {
				http.Error(w, `{"code":"STORE_NOT_FOUND","message":"Store not found"}`, http.StatusNotFound)
				return
			}

			ctx := context.WithValue(r.Context(), StoreIDKey, store.ID)
			ctx = context.WithValue(ctx, StoreSlugKey, store.Slug)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
