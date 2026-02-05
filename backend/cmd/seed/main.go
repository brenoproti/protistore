package main

import (
	"database/sql"
	"fmt"
	"log"
	"math"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"github.com/vibestore/backend/internal/config"
	"golang.org/x/crypto/bcrypt"
)

// ---------------------------------------------------------------------------
// Embedded migration SQL (matches backend/migrations/001–004)
// Using CREATE TABLE IF NOT EXISTS so re-runs are safe.
// ---------------------------------------------------------------------------

var migrations = []string{
	// 001_create_stores.sql
	`CREATE TABLE IF NOT EXISTS stores (
		id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		slug VARCHAR(255) NOT NULL UNIQUE,
		description TEXT,
		logo_url VARCHAR(500),
		favicon_url VARCHAR(500),
		is_active BOOLEAN NOT NULL DEFAULT TRUE,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		INDEX idx_stores_slug (slug),
		INDEX idx_stores_active (is_active)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

	`CREATE TABLE IF NOT EXISTS store_customizations (
		id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
		store_id BIGINT UNSIGNED NOT NULL UNIQUE,
		primary_color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
		secondary_color VARCHAR(7) NOT NULL DEFAULT '#4f46e5',
		accent_color VARCHAR(7) NOT NULL DEFAULT '#f59e0b',
		background_color VARCHAR(7) NOT NULL DEFAULT '#ffffff',
		text_color VARCHAR(7) NOT NULL DEFAULT '#1f2937',
		header_bg_color VARCHAR(7) NOT NULL DEFAULT '#ffffff',
		footer_bg_color VARCHAR(7) NOT NULL DEFAULT '#1f2937',
		font_family VARCHAR(100) NOT NULL DEFAULT 'Inter',
		border_radius VARCHAR(10) NOT NULL DEFAULT '8px',
		custom_css TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
		INDEX idx_store_customizations_store (store_id)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

	`CREATE TABLE IF NOT EXISTS store_admins (
		id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
		store_id BIGINT UNSIGNED NOT NULL,
		name VARCHAR(255) NOT NULL,
		email VARCHAR(255) NOT NULL,
		password_hash VARCHAR(255) NOT NULL,
		is_active BOOLEAN NOT NULL DEFAULT TRUE,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
		UNIQUE INDEX idx_store_admins_email (email),
		INDEX idx_store_admins_store (store_id)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

	// 002_create_catalog.sql
	`CREATE TABLE IF NOT EXISTS categories (
		id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
		store_id BIGINT UNSIGNED NOT NULL,
		parent_id BIGINT UNSIGNED,
		name VARCHAR(255) NOT NULL,
		slug VARCHAR(255) NOT NULL,
		description TEXT,
		image_url VARCHAR(500),
		sort_order INT NOT NULL DEFAULT 0,
		is_active BOOLEAN NOT NULL DEFAULT TRUE,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
		FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
		UNIQUE INDEX idx_categories_store_slug (store_id, slug),
		INDEX idx_categories_store (store_id),
		INDEX idx_categories_parent (parent_id)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

	`CREATE TABLE IF NOT EXISTS brands (
		id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
		store_id BIGINT UNSIGNED NOT NULL,
		name VARCHAR(255) NOT NULL,
		slug VARCHAR(255) NOT NULL,
		logo_url VARCHAR(500),
		is_active BOOLEAN NOT NULL DEFAULT TRUE,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
		UNIQUE INDEX idx_brands_store_slug (store_id, slug),
		INDEX idx_brands_store (store_id)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

	`CREATE TABLE IF NOT EXISTS products (
		id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
		store_id BIGINT UNSIGNED NOT NULL,
		category_id BIGINT UNSIGNED,
		brand_id BIGINT UNSIGNED,
		name VARCHAR(255) NOT NULL,
		slug VARCHAR(255) NOT NULL,
		description TEXT,
		price DECIMAL(10,2) NOT NULL,
		compare_at_price DECIMAL(10,2),
		cost_price DECIMAL(10,2),
		sku VARCHAR(100),
		stock INT NOT NULL DEFAULT 0,
		is_active BOOLEAN NOT NULL DEFAULT TRUE,
		is_featured BOOLEAN NOT NULL DEFAULT FALSE,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
		FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
		FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
		UNIQUE INDEX idx_products_store_slug (store_id, slug),
		INDEX idx_products_store (store_id),
		INDEX idx_products_category (category_id),
		INDEX idx_products_brand (brand_id),
		INDEX idx_products_featured (store_id, is_featured, is_active)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

	`CREATE TABLE IF NOT EXISTS product_images (
		id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
		product_id BIGINT UNSIGNED NOT NULL,
		url VARCHAR(500) NOT NULL,
		alt_text VARCHAR(255),
		sort_order INT NOT NULL DEFAULT 0,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
		INDEX idx_product_images_product (product_id)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

	// 003_create_banners.sql
	`CREATE TABLE IF NOT EXISTS banners (
		id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
		store_id BIGINT UNSIGNED NOT NULL,
		title VARCHAR(255) NOT NULL,
		subtitle VARCHAR(500),
		image_url VARCHAR(500) NOT NULL,
		link_url VARCHAR(500),
		sort_order INT NOT NULL DEFAULT 0,
		is_active BOOLEAN NOT NULL DEFAULT TRUE,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
		INDEX idx_banners_store (store_id),
		INDEX idx_banners_active (store_id, is_active, sort_order)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

	// 004_create_orders.sql
	`CREATE TABLE IF NOT EXISTS orders (
		id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
		store_id BIGINT UNSIGNED NOT NULL,
		order_number VARCHAR(50) NOT NULL,
		status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
		customer_name VARCHAR(255) NOT NULL,
		customer_email VARCHAR(255) NOT NULL,
		customer_phone VARCHAR(50),
		shipping_address TEXT NOT NULL,
		shipping_city VARCHAR(100) NOT NULL,
		shipping_state VARCHAR(100) NOT NULL,
		shipping_zip VARCHAR(20) NOT NULL,
		subtotal DECIMAL(10,2) NOT NULL,
		shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
		discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
		total DECIMAL(10,2) NOT NULL,
		notes TEXT,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
		UNIQUE INDEX idx_orders_number (order_number),
		INDEX idx_orders_store (store_id),
		INDEX idx_orders_status (store_id, status),
		INDEX idx_orders_created (store_id, created_at)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

	`CREATE TABLE IF NOT EXISTS order_items (
		id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
		order_id BIGINT UNSIGNED NOT NULL,
		product_id BIGINT UNSIGNED,
		product_name VARCHAR(255) NOT NULL,
		product_image VARCHAR(500),
		price DECIMAL(10,2) NOT NULL,
		quantity INT NOT NULL,
		total DECIMAL(10,2) NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
		FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
		INDEX idx_order_items_order (order_id)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
}

// ---------------------------------------------------------------------------
// Data types used to build seed data
// ---------------------------------------------------------------------------

type categoryDef struct {
	name        string
	slug        string
	description string
	subcats     []categoryDef
}

type brandDef struct {
	name string
	slug string
}

type productDef struct {
	name           string
	slug           string
	description    string
	price          float64
	compareAtPrice float64
	costPrice      float64
	sku            string
	stock          int
	isFeatured     bool
	categorySlug   string // resolved to ID at insert time
	brandSlug      string // resolved to ID at insert time
}

type bannerDef struct {
	title    string
	subtitle string
	linkURL  string
}

type orderDef struct {
	orderNumber     string
	status          string
	customerName    string
	customerEmail   string
	customerPhone   string
	shippingAddress string
	shippingCity    string
	shippingState   string
	shippingZip     string
	shippingCost    float64
	discount        float64
	daysAgo         int
	items           []orderItemDef
}

type orderItemDef struct {
	productIndex int // index into the products slice (0-based)
	quantity     int
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

func main() {
	cfg := config.Load()

	fmt.Println("=== Vibe Store Seed Script ===")
	fmt.Printf("Connecting to MySQL at %s:%s ...\n", cfg.DBHost, cfg.DBPort)

	dsn := cfg.DSN()

	// Allow multiStatements for migrations (not needed here since we split, but
	// the DSN helper doesn't include it — we execute one statement at a time).
	db, err := sql.Open("mysql", dsn+"&multiStatements=true")
	if err != nil {
		log.Fatalf("Failed to open DB: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}
	fmt.Println("Connected to MySQL successfully.")

	// -----------------------------------------------------------------------
	// Step 1 – Run migrations
	// -----------------------------------------------------------------------
	fmt.Println("\n--- Running migrations ---")
	for i, m := range migrations {
		if _, err := db.Exec(m); err != nil {
			log.Fatalf("Migration statement %d failed: %v", i+1, err)
		}
		fmt.Printf("  Migration statement %d/%d applied.\n", i+1, len(migrations))
	}
	fmt.Println("All migrations applied.")

	// -----------------------------------------------------------------------
	// Step 2 – Check if demo store already exists
	// -----------------------------------------------------------------------
	var existingID int64
	err = db.QueryRow("SELECT id FROM stores WHERE slug = ?", "vibestore").Scan(&existingID)
	if err == nil {
		fmt.Printf("\nDemo store already exists (id=%d, slug=vibestore). Skipping seed.\n", existingID)
		return
	}
	if err != sql.ErrNoRows {
		log.Fatalf("Error checking for existing store: %v", err)
	}

	// -----------------------------------------------------------------------
	// Step 3 – Create store
	// -----------------------------------------------------------------------
	fmt.Println("\n--- Creating demo store ---")
	storeRes, err := db.Exec(
		`INSERT INTO stores (name, slug, description, logo_url, favicon_url, is_active)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		"Vibe Store",
		"vibestore",
		"Your one-stop shop for everything trending. Quality products, unbeatable prices, and fast shipping.",
		"https://picsum.photos/seed/vibestore-logo/200/200",
		"https://picsum.photos/seed/vibestore-favicon/32/32",
		true,
	)
	if err != nil {
		log.Fatalf("Failed to create store: %v", err)
	}
	storeID, _ := storeRes.LastInsertId()
	fmt.Printf("  Created store \"Vibe Store\" (id=%d)\n", storeID)

	// -----------------------------------------------------------------------
	// Step 4 – Store customization
	// -----------------------------------------------------------------------
	fmt.Println("\n--- Creating store customization ---")
	_, err = db.Exec(
		`INSERT INTO store_customizations
		 (store_id, primary_color, secondary_color, accent_color, background_color, text_color, header_bg_color, footer_bg_color, font_family, border_radius)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		storeID,
		"#6366f1", // indigo primary
		"#4f46e5", // deeper indigo secondary
		"#f59e0b", // amber accent
		"#ffffff", // white background
		"#1f2937", // dark gray text
		"#ffffff", // white header
		"#1f2937", // dark footer
		"Inter",
		"8px",
	)
	if err != nil {
		log.Fatalf("Failed to create customization: %v", err)
	}
	fmt.Println("  Store customization created.")

	// -----------------------------------------------------------------------
	// Step 5 – Admin user
	// -----------------------------------------------------------------------
	fmt.Println("\n--- Creating admin user ---")
	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}
	_, err = db.Exec(
		`INSERT INTO store_admins (store_id, name, email, password_hash, is_active)
		 VALUES (?, ?, ?, ?, ?)`,
		storeID, "Store Admin", "admin@vibestore.com", string(hash), true,
	)
	if err != nil {
		log.Fatalf("Failed to create admin: %v", err)
	}
	fmt.Println("  Admin user created (admin@vibestore.com / password123)")

	// -----------------------------------------------------------------------
	// Step 6 – Categories
	// -----------------------------------------------------------------------
	fmt.Println("\n--- Creating categories ---")
	categories := []categoryDef{
		{
			name: "Electronics", slug: "electronics",
			description: "Discover the latest gadgets, devices, and tech accessories.",
			subcats: []categoryDef{
				{name: "Smartphones", slug: "smartphones", description: "Latest smartphones from top brands with cutting-edge features."},
				{name: "Laptops", slug: "laptops", description: "Powerful laptops for work, gaming, and everyday use."},
			},
		},
		{
			name: "Fashion", slug: "fashion",
			description: "Trendy clothing and accessories for every style.",
			subcats: []categoryDef{
				{name: "Men's Wear", slug: "mens-wear", description: "Stylish and comfortable clothing for men."},
				{name: "Women's Wear", slug: "womens-wear", description: "Elegant and fashionable clothing for women."},
			},
		},
		{name: "Home & Garden", slug: "home-garden", description: "Everything you need to make your home beautiful and comfortable."},
		{name: "Sports & Outdoors", slug: "sports-outdoors", description: "Gear up for your next adventure or workout session."},
		{name: "Books & Media", slug: "books-media", description: "Explore a wide selection of books, music, and digital media."},
		{name: "Health & Beauty", slug: "health-beauty", description: "Premium health, wellness, and beauty products for self-care."},
	}

	// Maps slug -> id for later use
	categoryMap := make(map[string]int64)

	for i, cat := range categories {
		res, err := db.Exec(
			`INSERT INTO categories (store_id, parent_id, name, slug, description, image_url, sort_order, is_active)
			 VALUES (?, NULL, ?, ?, ?, ?, ?, ?)`,
			storeID, cat.name, cat.slug, cat.description,
			fmt.Sprintf("https://picsum.photos/seed/cat-%s/400/400", cat.slug),
			i+1, true,
		)
		if err != nil {
			log.Fatalf("Failed to create category %s: %v", cat.name, err)
		}
		parentID, _ := res.LastInsertId()
		categoryMap[cat.slug] = parentID
		fmt.Printf("  Created category \"%s\" (id=%d)\n", cat.name, parentID)

		for j, sub := range cat.subcats {
			subRes, err := db.Exec(
				`INSERT INTO categories (store_id, parent_id, name, slug, description, image_url, sort_order, is_active)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				storeID, parentID, sub.name, sub.slug, sub.description,
				fmt.Sprintf("https://picsum.photos/seed/cat-%s/400/400", sub.slug),
				j+1, true,
			)
			if err != nil {
				log.Fatalf("Failed to create subcategory %s: %v", sub.name, err)
			}
			subID, _ := subRes.LastInsertId()
			categoryMap[sub.slug] = subID
			fmt.Printf("    Created subcategory \"%s\" (id=%d)\n", sub.name, subID)
		}
	}

	// -----------------------------------------------------------------------
	// Step 7 – Brands
	// -----------------------------------------------------------------------
	fmt.Println("\n--- Creating brands ---")
	brands := []brandDef{
		{name: "Apple", slug: "apple"},
		{name: "Samsung", slug: "samsung"},
		{name: "Nike", slug: "nike"},
		{name: "Adidas", slug: "adidas"},
		{name: "Sony", slug: "sony"},
		{name: "Canon", slug: "canon"},
	}

	brandMap := make(map[string]int64)
	for _, b := range brands {
		res, err := db.Exec(
			`INSERT INTO brands (store_id, name, slug, logo_url, is_active)
			 VALUES (?, ?, ?, ?, ?)`,
			storeID, b.name, b.slug,
			fmt.Sprintf("https://picsum.photos/seed/brand-%s/200/200", b.slug),
			true,
		)
		if err != nil {
			log.Fatalf("Failed to create brand %s: %v", b.name, err)
		}
		id, _ := res.LastInsertId()
		brandMap[b.slug] = id
		fmt.Printf("  Created brand \"%s\" (id=%d)\n", b.name, id)
	}

	// -----------------------------------------------------------------------
	// Step 8 – Products (24 products)
	// -----------------------------------------------------------------------
	fmt.Println("\n--- Creating products ---")
	products := []productDef{
		// --- Electronics / Smartphones ---
		{name: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", description: "The most powerful iPhone ever with A17 Pro chip, titanium design, and an advanced camera system for stunning photos and videos.", price: 1199.00, compareAtPrice: 1299.00, costPrice: 899.00, sku: "ELEC-APL-001", stock: 45, isFeatured: true, categorySlug: "smartphones", brandSlug: "apple"},
		{name: "Samsung Galaxy S24 Ultra", slug: "samsung-galaxy-s24-ultra", description: "Experience Galaxy AI with the most powerful Galaxy smartphone. Features a built-in S Pen, 200MP camera, and titanium frame.", price: 1099.00, compareAtPrice: 1199.00, costPrice: 820.00, sku: "ELEC-SAM-001", stock: 38, isFeatured: true, categorySlug: "smartphones", brandSlug: "samsung"},
		{name: "iPhone 15", slug: "iphone-15", description: "Dynamic Island, 48MP camera, and USB-C. A new era of iPhone with the powerful A16 Bionic chip.", price: 799.00, compareAtPrice: 0, costPrice: 580.00, sku: "ELEC-APL-002", stock: 60, isFeatured: false, categorySlug: "smartphones", brandSlug: "apple"},
		{name: "Samsung Galaxy A54", slug: "samsung-galaxy-a54", description: "Awesome Galaxy experience with a stunning Super AMOLED display, versatile triple camera, and long-lasting battery.", price: 449.00, compareAtPrice: 499.00, costPrice: 310.00, sku: "ELEC-SAM-002", stock: 75, isFeatured: false, categorySlug: "smartphones", brandSlug: "samsung"},

		// --- Electronics / Laptops ---
		{name: "MacBook Pro 16\" M3 Max", slug: "macbook-pro-16-m3-max", description: "Supercharged by M3 Max with up to 128GB unified memory. The most powerful MacBook Pro ever with stunning Liquid Retina XDR display.", price: 3499.00, compareAtPrice: 0, costPrice: 2800.00, sku: "ELEC-APL-003", stock: 15, isFeatured: true, categorySlug: "laptops", brandSlug: "apple"},
		{name: "Samsung Galaxy Book4 Pro", slug: "samsung-galaxy-book4-pro", description: "Ultra-thin and lightweight laptop with Intel Core Ultra processor, vivid AMOLED display, and all-day battery life.", price: 1449.00, compareAtPrice: 1599.00, costPrice: 1050.00, sku: "ELEC-SAM-003", stock: 22, isFeatured: false, categorySlug: "laptops", brandSlug: "samsung"},

		// --- Fashion / Men's Wear ---
		{name: "Nike Dri-FIT Running Jacket", slug: "nike-dri-fit-running-jacket", description: "Lightweight and breathable running jacket with Dri-FIT technology to keep you dry and comfortable on every run.", price: 89.99, compareAtPrice: 110.00, costPrice: 45.00, sku: "FASH-NIK-001", stock: 120, isFeatured: false, categorySlug: "mens-wear", brandSlug: "nike"},
		{name: "Adidas Essentials Hoodie", slug: "adidas-essentials-hoodie", description: "Classic comfort meets modern style. This cozy fleece hoodie features the iconic 3-Stripes design and a kangaroo pocket.", price: 65.00, compareAtPrice: 0, costPrice: 30.00, sku: "FASH-ADI-001", stock: 95, isFeatured: false, categorySlug: "mens-wear", brandSlug: "adidas"},
		{name: "Nike Tech Fleece Joggers", slug: "nike-tech-fleece-joggers", description: "Premium Nike Tech Fleece joggers with tapered leg design. Lightweight warmth and a sleek, modern silhouette.", price: 110.00, compareAtPrice: 130.00, costPrice: 55.00, sku: "FASH-NIK-002", stock: 80, isFeatured: true, categorySlug: "mens-wear", brandSlug: "nike"},

		// --- Fashion / Women's Wear ---
		{name: "Nike Air Max Dress", slug: "nike-air-max-dress", description: "A sporty yet elegant dress that blends athletic comfort with everyday style. Perfect for brunch or casual outings.", price: 75.00, compareAtPrice: 95.00, costPrice: 35.00, sku: "FASH-NIK-003", stock: 65, isFeatured: false, categorySlug: "womens-wear", brandSlug: "nike"},
		{name: "Adidas Ultraboost Leggings", slug: "adidas-ultraboost-leggings", description: "High-waisted performance leggings with Primeknit construction. Designed for comfort during workouts and beyond.", price: 80.00, compareAtPrice: 0, costPrice: 38.00, sku: "FASH-ADI-002", stock: 110, isFeatured: false, categorySlug: "womens-wear", brandSlug: "adidas"},

		// --- Home & Garden ---
		{name: "Sony WH-1000XM5 Headphones", slug: "sony-wh-1000xm5", description: "Industry-leading noise cancellation headphones with exceptional sound quality, 30-hour battery life, and ultra-comfortable design.", price: 349.99, compareAtPrice: 399.99, costPrice: 220.00, sku: "HOME-SNY-001", stock: 55, isFeatured: true, categorySlug: "home-garden", brandSlug: "sony"},
		{name: "Sony SRS-XB100 Portable Speaker", slug: "sony-srs-xb100", description: "Ultra-portable Bluetooth speaker with extra bass, IP67 waterproof rating, and 16-hour battery life. Take the party anywhere.", price: 59.99, compareAtPrice: 0, costPrice: 32.00, sku: "HOME-SNY-002", stock: 140, isFeatured: false, categorySlug: "home-garden", brandSlug: "sony"},
		{name: "Canon PIXMA Wireless Printer", slug: "canon-pixma-wireless-printer", description: "Compact all-in-one wireless printer with vivid color printing, scanning, and copying. Easy mobile printing support.", price: 129.99, compareAtPrice: 159.99, costPrice: 78.00, sku: "HOME-CAN-001", stock: 35, isFeatured: false, categorySlug: "home-garden", brandSlug: "canon"},

		// --- Sports & Outdoors ---
		{name: "Nike Air Zoom Pegasus 41", slug: "nike-air-zoom-pegasus-41", description: "The workhorse running shoe returns with responsive Zoom Air cushioning, breathable mesh upper, and a secure midfoot fit.", price: 139.99, compareAtPrice: 0, costPrice: 68.00, sku: "SPRT-NIK-001", stock: 90, isFeatured: true, categorySlug: "sports-outdoors", brandSlug: "nike"},
		{name: "Adidas Predator Elite FG", slug: "adidas-predator-elite-fg", description: "Dominate the pitch with Controlskin technology for unrivaled touch and precision. Firm ground football boots built for the best.", price: 299.99, compareAtPrice: 0, costPrice: 150.00, sku: "SPRT-ADI-001", stock: 40, isFeatured: false, categorySlug: "sports-outdoors", brandSlug: "adidas"},
		{name: "Nike Brasilia Training Backpack", slug: "nike-brasilia-training-backpack", description: "Durable training backpack with multiple compartments, padded shoulder straps, and a ventilated shoe compartment.", price: 45.00, compareAtPrice: 55.00, costPrice: 22.00, sku: "SPRT-NIK-002", stock: 200, isFeatured: false, categorySlug: "sports-outdoors", brandSlug: "nike"},
		{name: "Adidas Tiro 23 Training Pants", slug: "adidas-tiro-23-training-pants", description: "Slim-fit training pants with AEROREADY moisture management, zip pockets, and the iconic 3-Stripes on the legs.", price: 55.00, compareAtPrice: 65.00, costPrice: 26.00, sku: "SPRT-ADI-002", stock: 150, isFeatured: false, categorySlug: "sports-outdoors", brandSlug: "adidas"},

		// --- Books & Media ---
		{name: "Sony WF-1000XM5 Earbuds", slug: "sony-wf-1000xm5-earbuds", description: "The world's best noise cancelling truly wireless earbuds. Exceptional sound with LDAC, all-day comfort, and crystal-clear calls.", price: 299.99, compareAtPrice: 0, costPrice: 185.00, sku: "BOOK-SNY-001", stock: 70, isFeatured: false, categorySlug: "books-media", brandSlug: "sony"},
		{name: "Canon EOS R50 Mirrorless Camera", slug: "canon-eos-r50-mirrorless", description: "Compact and lightweight mirrorless camera with 24.2MP sensor, 4K video, and advanced autofocus. Perfect for content creators.", price: 679.99, compareAtPrice: 799.99, costPrice: 480.00, sku: "BOOK-CAN-001", stock: 25, isFeatured: false, categorySlug: "books-media", brandSlug: "canon"},

		// --- Health & Beauty ---
		{name: "Apple Watch Series 9", slug: "apple-watch-series-9", description: "The ultimate health and fitness companion with advanced sensors, S9 chip, and a brilliant always-on Retina display.", price: 399.00, compareAtPrice: 449.00, costPrice: 280.00, sku: "HLTH-APL-001", stock: 50, isFeatured: false, categorySlug: "health-beauty", brandSlug: "apple"},
		{name: "Samsung Galaxy Watch6 Classic", slug: "samsung-galaxy-watch6-classic", description: "Premium smartwatch with rotating bezel, advanced health monitoring, sleep coaching, and a stunning Super AMOLED display.", price: 349.99, compareAtPrice: 399.99, costPrice: 230.00, sku: "HLTH-SAM-001", stock: 42, isFeatured: false, categorySlug: "health-beauty", brandSlug: "samsung"},
		{name: "Nike Yoga Mat Premium", slug: "nike-yoga-mat-premium", description: "Extra-thick 5mm yoga mat with non-slip textured surface and alignment lines. Lightweight, durable, and easy to clean.", price: 49.99, compareAtPrice: 0, costPrice: 18.00, sku: "HLTH-NIK-001", stock: 180, isFeatured: false, categorySlug: "health-beauty", brandSlug: "nike"},
		{name: "Canon PowerShot V10 Vlog Camera", slug: "canon-powershot-v10-vlog", description: "Pocket-sized vlog camera with a wide-angle lens, built-in stand, and stunning 4K video. Your perfect vlogging companion.", price: 429.99, compareAtPrice: 479.99, costPrice: 290.00, sku: "HLTH-CAN-001", stock: 30, isFeatured: false, categorySlug: "health-beauty", brandSlug: "canon"},
	}

	// We store product IDs in order so we can reference them in orders
	type insertedProduct struct {
		id       int64
		name     string
		slug     string
		price    float64
		imageURL string
	}
	insertedProducts := make([]insertedProduct, 0, len(products))

	for _, p := range products {
		catID := categoryMap[p.categorySlug]
		bID := brandMap[p.brandSlug]

		var compareAt interface{} = p.compareAtPrice
		if p.compareAtPrice == 0 {
			compareAt = nil
		}

		res, err := db.Exec(
			`INSERT INTO products (store_id, category_id, brand_id, name, slug, description, price, compare_at_price, cost_price, sku, stock, is_active, is_featured)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			storeID, catID, bID,
			p.name, p.slug, p.description,
			p.price, compareAt, p.costPrice,
			p.sku, p.stock, true, p.isFeatured,
		)
		if err != nil {
			log.Fatalf("Failed to create product %s: %v", p.name, err)
		}
		prodID, _ := res.LastInsertId()

		mainImage := fmt.Sprintf("https://picsum.photos/seed/%s/800/800", p.slug)
		secondImage := fmt.Sprintf("https://picsum.photos/seed/%s-2/800/800", p.slug)

		// Insert main image
		_, err = db.Exec(
			`INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)`,
			prodID, mainImage, p.name+" - Main Image", 1,
		)
		if err != nil {
			log.Fatalf("Failed to create main image for %s: %v", p.name, err)
		}

		// Insert second image
		_, err = db.Exec(
			`INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)`,
			prodID, secondImage, p.name+" - Alternate View", 2,
		)
		if err != nil {
			log.Fatalf("Failed to create second image for %s: %v", p.name, err)
		}

		insertedProducts = append(insertedProducts, insertedProduct{
			id:       prodID,
			name:     p.name,
			slug:     p.slug,
			price:    p.price,
			imageURL: mainImage,
		})

		featuredTag := ""
		if p.isFeatured {
			featuredTag = " [FEATURED]"
		}
		fmt.Printf("  Created product \"%s\" (id=%d, $%.2f)%s\n", p.name, prodID, p.price, featuredTag)
	}

	// -----------------------------------------------------------------------
	// Step 9 – Banners
	// -----------------------------------------------------------------------
	fmt.Println("\n--- Creating banners ---")
	banners := []bannerDef{
		{title: "New Arrivals", subtitle: "Discover the latest products fresh off the shelf. Be the first to get your hands on what's new.", linkURL: "/products?sort=newest"},
		{title: "Summer Sale", subtitle: "Up to 50% off on selected items. Don't miss our biggest sale of the season!", linkURL: "/products?sale=true"},
		{title: "Free Shipping", subtitle: "Enjoy free shipping on all orders over $99. No code needed, applied automatically at checkout.", linkURL: "/products"},
		{title: "Tech Essentials", subtitle: "Upgrade your setup with the latest electronics and gadgets from top brands.", linkURL: "/categories/electronics"},
		{title: "Fitness Collection", subtitle: "Gear up for your fitness goals with premium sportswear and equipment.", linkURL: "/categories/sports-outdoors"},
		{title: "Member Exclusive", subtitle: "Sign up today and get 15% off your first order. Join thousands of happy Vibe Store customers.", linkURL: "/register"},
	}

	for i, b := range banners {
		_, err := db.Exec(
			`INSERT INTO banners (store_id, title, subtitle, image_url, link_url, sort_order, is_active)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			storeID, b.title, b.subtitle,
			fmt.Sprintf("https://picsum.photos/seed/banner-%d/1200/400", i+1),
			b.linkURL, i+1, true,
		)
		if err != nil {
			log.Fatalf("Failed to create banner %s: %v", b.title, err)
		}
		fmt.Printf("  Created banner \"%s\" (sort=%d)\n", b.title, i+1)
	}

	// -----------------------------------------------------------------------
	// Step 10 – Orders (12 orders)
	// -----------------------------------------------------------------------
	fmt.Println("\n--- Creating sample orders ---")
	orders := []orderDef{
		{
			orderNumber: "VS-1001", status: "delivered",
			customerName: "Alice Johnson", customerEmail: "alice.johnson@email.com", customerPhone: "(555) 123-4567",
			shippingAddress: "123 Oak Street, Apt 4B", shippingCity: "New York", shippingState: "NY", shippingZip: "10001",
			shippingCost: 9.99, discount: 0, daysAgo: 28,
			items: []orderItemDef{{productIndex: 0, quantity: 1}, {productIndex: 11, quantity: 1}},
		},
		{
			orderNumber: "VS-1002", status: "delivered",
			customerName: "Bob Martinez", customerEmail: "bob.martinez@email.com", customerPhone: "(555) 234-5678",
			shippingAddress: "456 Maple Avenue", shippingCity: "Los Angeles", shippingState: "CA", shippingZip: "90001",
			shippingCost: 0, discount: 15.00, daysAgo: 25,
			items: []orderItemDef{{productIndex: 4, quantity: 1}},
		},
		{
			orderNumber: "VS-1003", status: "delivered",
			customerName: "Carol White", customerEmail: "carol.white@email.com", customerPhone: "(555) 345-6789",
			shippingAddress: "789 Pine Road", shippingCity: "Chicago", shippingState: "IL", shippingZip: "60601",
			shippingCost: 9.99, discount: 0, daysAgo: 22,
			items: []orderItemDef{{productIndex: 6, quantity: 2}, {productIndex: 8, quantity: 1}},
		},
		{
			orderNumber: "VS-1004", status: "shipped",
			customerName: "David Chen", customerEmail: "david.chen@email.com", customerPhone: "(555) 456-7890",
			shippingAddress: "321 Elm Boulevard, Suite 100", shippingCity: "San Francisco", shippingState: "CA", shippingZip: "94102",
			shippingCost: 9.99, discount: 20.00, daysAgo: 18,
			items: []orderItemDef{{productIndex: 1, quantity: 1}, {productIndex: 14, quantity: 1}},
		},
		{
			orderNumber: "VS-1005", status: "shipped",
			customerName: "Emily Davis", customerEmail: "emily.davis@email.com", customerPhone: "(555) 567-8901",
			shippingAddress: "654 Birch Lane", shippingCity: "Seattle", shippingState: "WA", shippingZip: "98101",
			shippingCost: 0, discount: 0, daysAgo: 15,
			items: []orderItemDef{{productIndex: 20, quantity: 1}, {productIndex: 22, quantity: 1}},
		},
		{
			orderNumber: "VS-1006", status: "processing",
			customerName: "Frank Wilson", customerEmail: "frank.wilson@email.com", customerPhone: "(555) 678-9012",
			shippingAddress: "987 Cedar Court", shippingCity: "Austin", shippingState: "TX", shippingZip: "73301",
			shippingCost: 9.99, discount: 0, daysAgo: 10,
			items: []orderItemDef{{productIndex: 14, quantity: 1}, {productIndex: 16, quantity: 1}, {productIndex: 17, quantity: 1}},
		},
		{
			orderNumber: "VS-1007", status: "processing",
			customerName: "Grace Kim", customerEmail: "grace.kim@email.com", customerPhone: "(555) 789-0123",
			shippingAddress: "147 Walnut Street", shippingCity: "Portland", shippingState: "OR", shippingZip: "97201",
			shippingCost: 0, discount: 10.00, daysAgo: 8,
			items: []orderItemDef{{productIndex: 9, quantity: 1}, {productIndex: 10, quantity: 2}},
		},
		{
			orderNumber: "VS-1008", status: "confirmed",
			customerName: "Henry Thompson", customerEmail: "henry.thompson@email.com", customerPhone: "(555) 890-1234",
			shippingAddress: "258 Spruce Drive", shippingCity: "Denver", shippingState: "CO", shippingZip: "80201",
			shippingCost: 9.99, discount: 0, daysAgo: 5,
			items: []orderItemDef{{productIndex: 3, quantity: 1}, {productIndex: 12, quantity: 1}},
		},
		{
			orderNumber: "VS-1009", status: "confirmed",
			customerName: "Isabel Garcia", customerEmail: "isabel.garcia@email.com", customerPhone: "(555) 901-2345",
			shippingAddress: "369 Ash Way, Unit 7", shippingCity: "Miami", shippingState: "FL", shippingZip: "33101",
			shippingCost: 0, discount: 5.00, daysAgo: 4,
			items: []orderItemDef{{productIndex: 18, quantity: 1}},
		},
		{
			orderNumber: "VS-1010", status: "pending",
			customerName: "Jack Brown", customerEmail: "jack.brown@email.com", customerPhone: "(555) 012-3456",
			shippingAddress: "741 Poplar Place", shippingCity: "Boston", shippingState: "MA", shippingZip: "02101",
			shippingCost: 9.99, discount: 0, daysAgo: 2,
			items: []orderItemDef{{productIndex: 2, quantity: 1}, {productIndex: 7, quantity: 1}},
		},
		{
			orderNumber: "VS-1011", status: "pending",
			customerName: "Karen Lee", customerEmail: "karen.lee@email.com", customerPhone: "(555) 123-7890",
			shippingAddress: "852 Willow Road", shippingCity: "Nashville", shippingState: "TN", shippingZip: "37201",
			shippingCost: 0, discount: 0, daysAgo: 1,
			items: []orderItemDef{{productIndex: 5, quantity: 1}, {productIndex: 19, quantity: 1}, {productIndex: 15, quantity: 1}},
		},
		{
			orderNumber: "VS-1012", status: "cancelled",
			customerName: "Leo Nguyen", customerEmail: "leo.nguyen@email.com", customerPhone: "(555) 234-8901",
			shippingAddress: "963 Magnolia Avenue", shippingCity: "Phoenix", shippingState: "AZ", shippingZip: "85001",
			shippingCost: 9.99, discount: 0, daysAgo: 12,
			items: []orderItemDef{{productIndex: 13, quantity: 1}, {productIndex: 21, quantity: 1}},
		},
	}

	for _, o := range orders {
		// Calculate subtotal from items
		var subtotal float64
		for _, item := range o.items {
			p := insertedProducts[item.productIndex]
			subtotal += p.price * float64(item.quantity)
		}
		total := subtotal + o.shippingCost - o.discount
		total = math.Round(total*100) / 100

		res, err := db.Exec(
			`INSERT INTO orders (store_id, order_number, status, customer_name, customer_email, customer_phone,
			 shipping_address, shipping_city, shipping_state, shipping_zip,
			 subtotal, shipping_cost, discount, total, created_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
			storeID, o.orderNumber, o.status,
			o.customerName, o.customerEmail, o.customerPhone,
			o.shippingAddress, o.shippingCity, o.shippingState, o.shippingZip,
			subtotal, o.shippingCost, o.discount, total,
			o.daysAgo,
		)
		if err != nil {
			log.Fatalf("Failed to create order %s: %v", o.orderNumber, err)
		}
		orderID, _ := res.LastInsertId()

		// Insert order items
		for _, item := range o.items {
			p := insertedProducts[item.productIndex]
			itemTotal := p.price * float64(item.quantity)
			itemTotal = math.Round(itemTotal*100) / 100

			_, err := db.Exec(
				`INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, total)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				orderID, p.id, p.name, p.imageURL, p.price, item.quantity, itemTotal,
			)
			if err != nil {
				log.Fatalf("Failed to create order item for order %s: %v", o.orderNumber, err)
			}
		}

		itemNames := make([]string, len(o.items))
		for i, item := range o.items {
			itemNames[i] = insertedProducts[item.productIndex].name
		}
		fmt.Printf("  Created order %s [%s] $%.2f — %d item(s): %s\n",
			o.orderNumber, o.status, total, len(o.items), strings.Join(itemNames, ", "))
	}

	// -----------------------------------------------------------------------
	// Done
	// -----------------------------------------------------------------------
	fmt.Println("\n=== Seed completed successfully! ===")
	fmt.Println("  Store:  Vibe Store (slug: vibestore)")
	fmt.Println("  Admin:  admin@vibestore.com / password123")
	fmt.Printf("  Data:   %d categories, %d brands, %d products, %d banners, %d orders\n",
		len(categoryMap), len(brands), len(products), len(banners), len(orders))
}
