package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

const AdminIDKey contextKey = "admin_id"
const AdminStoreIDKey contextKey = "admin_store_id"
const AdminEmailKey contextKey = "admin_email"

func GetAdminID(ctx context.Context) uint64 {
	if v, ok := ctx.Value(AdminIDKey).(uint64); ok {
		return v
	}
	return 0
}

func GetAdminStoreID(ctx context.Context) uint64 {
	if v, ok := ctx.Value(AdminStoreIDKey).(uint64); ok {
		return v
	}
	return 0
}

func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"code":"UNAUTHORIZED","message":"Missing authorization header"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, `{"code":"UNAUTHORIZED","message":"Invalid authorization format"}`, http.StatusUnauthorized)
				return
			}

			tokenStr := parts[1]
			token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})
			if err != nil || !token.Valid {
				http.Error(w, `{"code":"UNAUTHORIZED","message":"Invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, `{"code":"UNAUTHORIZED","message":"Invalid token claims"}`, http.StatusUnauthorized)
				return
			}

			tokenType, _ := claims["type"].(string)
			if tokenType != "access" {
				http.Error(w, `{"code":"UNAUTHORIZED","message":"Invalid token type"}`, http.StatusUnauthorized)
				return
			}

			adminID := uint64(claims["admin_id"].(float64))
			storeID := uint64(claims["store_id"].(float64))
			email, _ := claims["email"].(string)

			ctx := context.WithValue(r.Context(), AdminIDKey, adminID)
			ctx = context.WithValue(ctx, AdminStoreIDKey, storeID)
			ctx = context.WithValue(ctx, AdminEmailKey, email)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
