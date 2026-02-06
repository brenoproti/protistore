package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	_ "github.com/go-sql-driver/mysql"

	"github.com/vibestore/backend/internal/config"
	"github.com/vibestore/backend/internal/handler"
	"github.com/vibestore/backend/internal/middleware"
	"github.com/vibestore/backend/internal/repository"
	"github.com/vibestore/backend/internal/service"
)

func main() {
	cfg := config.Load()

	db, err := sql.Open("mysql", cfg.DSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}
	log.Println("Connected to database")

	// Run migrations
	if err := runMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Repositories
	storeRepo := repository.NewStoreRepository(db)
	adminRepo := repository.NewAdminRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	brandRepo := repository.NewBrandRepository(db)
	productRepo := repository.NewProductRepository(db)
	bannerRepo := repository.NewBannerRepository(db)
	orderRepo := repository.NewOrderRepository(db)

	// Services
	authService := service.NewAuthService(adminRepo, cfg.JWTSecret)

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	storeHandler := handler.NewStoreHandler(storeRepo)
	customizationHandler := handler.NewCustomizationHandler(storeRepo)
	categoryHandler := handler.NewCategoryHandler(categoryRepo)
	brandHandler := handler.NewBrandHandler(brandRepo)
	productHandler := handler.NewProductHandler(productRepo)
	bannerHandler := handler.NewBannerHandler(bannerRepo)
	orderHandler := handler.NewOrderHandler(orderRepo, productRepo)
	dashboardHandler := handler.NewDashboardHandler(orderRepo, productRepo)
	importHandler := handler.NewImportHandler(productRepo, categoryRepo, brandRepo)
	uploadHandler := handler.NewUploadHandler(cfg.UploadDir)

	// S3 presign handler (only if S3 is configured)
	var presignHandler *handler.PresignHandler
	if cfg.S3Bucket != "" && cfg.S3AccessKey != "" {
		presignHandler = handler.NewPresignHandler(cfg)
		log.Printf("S3 upload enabled (bucket: %s)", cfg.S3Bucket)
	} else {
		log.Println("S3 not configured, using local file upload")
	}

	r := chi.NewRouter()

	// Global middleware
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.RealIP)
	r.Use(cors.Handler(middleware.CORSConfig()))

	// Static files
	workDir, _ := os.Getwd()
	uploadsDir := filepath.Join(workDir, cfg.UploadDir)
	os.MkdirAll(uploadsDir, 0755)
	fileServer := http.StripPrefix("/uploads", http.FileServer(http.Dir(uploadsDir)))
	r.Handle("/uploads/*", fileServer)

	// Health check
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	r.Route("/api/v1", func(r chi.Router) {
		// Platform-level routes (no tenant/auth middleware)
		r.Get("/stores", storeHandler.ListStores)

		// Auth routes (tenant middleware validates subdomain)
		r.Route("/auth", func(r chi.Router) {
			r.Use(middleware.TenantMiddleware(storeRepo))
			r.Post("/login", authHandler.Login)
			r.Post("/refresh", authHandler.Refresh)
			r.Post("/logout", authHandler.Logout)
		})

		// Public store routes (need tenant middleware)
		r.Route("/store", func(r chi.Router) {
			r.Use(middleware.TenantMiddleware(storeRepo))

			r.Get("/info", storeHandler.GetStoreInfo)
			r.Get("/categories", categoryHandler.ListPublic)
			r.Get("/brands", brandHandler.ListPublic)
			r.Get("/products", productHandler.ListPublic)
			r.Get("/products/{slug}", productHandler.GetBySlug)
			r.Get("/banners", bannerHandler.ListPublic)
			r.Post("/cart", orderHandler.ValidateCart)
			r.Post("/orders", orderHandler.Checkout)
			r.Get("/orders", orderHandler.GetByOrderNumber)
		})

		// Admin routes (tenant + auth middleware)
		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.TenantMiddleware(storeRepo))
			r.Use(middleware.AuthMiddleware(cfg.JWTSecret))

			r.Get("/store", storeHandler.AdminGetStore)
			r.Put("/store", storeHandler.AdminUpdateStore)

			r.Get("/customization", customizationHandler.Get)
			r.Put("/customization", customizationHandler.Update)

			r.Get("/categories", categoryHandler.List)
			r.Get("/categories/{id}", categoryHandler.Get)
			r.Post("/categories", categoryHandler.Create)
			r.Put("/categories/{id}", categoryHandler.Update)
			r.Delete("/categories/{id}", categoryHandler.Delete)

			r.Get("/brands", brandHandler.List)
			r.Get("/brands/{id}", brandHandler.Get)
			r.Post("/brands", brandHandler.Create)
			r.Put("/brands/{id}", brandHandler.Update)
			r.Delete("/brands/{id}", brandHandler.Delete)

			r.Get("/products", productHandler.List)
			r.Post("/products/import", importHandler.Import)
			r.Get("/products/export", importHandler.Export)
			r.Get("/products/{id}", productHandler.Get)
			r.Post("/products", productHandler.Create)
			r.Put("/products/{id}", productHandler.Update)
			r.Delete("/products/{id}", productHandler.Delete)

			r.Get("/banners", bannerHandler.List)
			r.Get("/banners/{id}", bannerHandler.Get)
			r.Post("/banners", bannerHandler.Create)
			r.Put("/banners/{id}", bannerHandler.Update)
			r.Delete("/banners/{id}", bannerHandler.Delete)

			r.Get("/orders", orderHandler.AdminList)
			r.Get("/orders/{id}", orderHandler.AdminGet)
			r.Put("/orders/{id}/status", orderHandler.AdminUpdateStatus)

			r.Get("/dashboard", dashboardHandler.Get)

			r.Post("/upload", uploadHandler.Upload)
			if presignHandler != nil {
				r.Post("/presign", presignHandler.Presign)
			}
		})
	})

	addr := fmt.Sprintf(":%s", cfg.ServerPort)
	log.Printf("Server starting on %s", addr)
	if err := http.ListenAndServe(addr, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func runMigrations(db *sql.DB) error {
	migrationsDir := "migrations"
	if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
		// Try relative to binary
		migrationsDir = filepath.Join("..", "..", "migrations")
		if _, err := os.Stat(migrationsDir); os.IsNotExist(err) {
			log.Println("No migrations directory found, skipping migrations")
			return nil
		}
	}

	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	// Sort by name
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}

		path := filepath.Join(migrationsDir, entry.Name())
		content, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", entry.Name(), err)
		}

		statements := strings.Split(string(content), ";")
		for _, stmt := range statements {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			if _, err := db.Exec(stmt); err != nil {
				return fmt.Errorf("failed to execute migration %s: %w", entry.Name(), err)
			}
		}

		log.Printf("Applied migration: %s", entry.Name())
	}

	return nil
}
