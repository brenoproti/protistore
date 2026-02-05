package middleware

import (
	"github.com/go-chi/cors"
)

func CORSConfig() cors.Options {
	return cors.Options{
		AllowedOrigins:   []string{"http://*.localhost:*", "http://localhost:*", "https://*.vibestore.com"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Store-Slug"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}
}
