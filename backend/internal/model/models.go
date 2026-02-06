package model

import (
	"database/sql"
	"time"
)

type Store struct {
	ID             uint64    `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	Description    *string   `json:"description"`
	LogoURL        *string   `json:"logo_url"`
	FaviconURL     *string   `json:"favicon_url"`
	WhatsappNumber *string   `json:"whatsapp_number"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type StoreCustomization struct {
	ID              uint64    `json:"id"`
	StoreID         uint64    `json:"store_id"`
	PrimaryColor    string    `json:"primary_color"`
	SecondaryColor  string    `json:"secondary_color"`
	AccentColor     string    `json:"accent_color"`
	BackgroundColor string    `json:"background_color"`
	TextColor       string    `json:"text_color"`
	HeaderBgColor   string    `json:"header_bg_color"`
	FooterBgColor   string    `json:"footer_bg_color"`
	FontFamily      string    `json:"font_family"`
	BorderRadius    string    `json:"border_radius"`
	CustomCSS       *string   `json:"custom_css"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type StoreAdmin struct {
	ID           uint64    `json:"id"`
	StoreID      uint64    `json:"store_id"`
	Name         string    `json:"name"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Category struct {
	ID          uint64         `json:"id"`
	StoreID     uint64         `json:"store_id"`
	ParentID    *uint64        `json:"parent_id"`
	Name        string         `json:"name"`
	Slug        string         `json:"slug"`
	Description *string        `json:"description"`
	ImageURL    *string        `json:"image_url"`
	SortOrder   int            `json:"sort_order"`
	IsActive    bool           `json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	Children    []Category     `json:"children,omitempty"`
}

type Brand struct {
	ID        uint64    `json:"id"`
	StoreID   uint64    `json:"store_id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	LogoURL   *string   `json:"logo_url"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Product struct {
	ID             uint64          `json:"id"`
	StoreID        uint64          `json:"store_id"`
	CategoryID     *uint64         `json:"category_id"`
	BrandID        *uint64         `json:"brand_id"`
	Name           string          `json:"name"`
	Slug           string          `json:"slug"`
	Description    *string         `json:"description"`
	Price          float64         `json:"price"`
	CompareAtPrice *float64        `json:"compare_at_price"`
	CostPrice      *float64        `json:"cost_price"`
	SKU            *string         `json:"sku"`
	Stock          int             `json:"stock"`
	IsActive       bool            `json:"is_active"`
	IsFeatured     bool            `json:"is_featured"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	Images         []ProductImage  `json:"images,omitempty"`
	Category       *Category       `json:"category,omitempty"`
	Brand          *Brand          `json:"brand,omitempty"`
}

type ProductImage struct {
	ID        uint64    `json:"id"`
	ProductID uint64    `json:"product_id"`
	URL       string    `json:"url"`
	AltText   *string   `json:"alt_text"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
}

type Banner struct {
	ID        uint64    `json:"id"`
	StoreID   uint64    `json:"store_id"`
	Title     string    `json:"title"`
	Subtitle  *string   `json:"subtitle"`
	ImageURL  string    `json:"image_url"`
	LinkURL   *string   `json:"link_url"`
	SortOrder int       `json:"sort_order"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Order struct {
	ID              uint64      `json:"id"`
	StoreID         uint64      `json:"store_id"`
	OrderNumber     string      `json:"order_number"`
	Status          string      `json:"status"`
	CustomerName    string      `json:"customer_name"`
	CustomerEmail   string      `json:"customer_email"`
	CustomerPhone   *string     `json:"customer_phone"`
	ShippingAddress string      `json:"shipping_address"`
	ShippingCity    string      `json:"shipping_city"`
	ShippingState   string      `json:"shipping_state"`
	ShippingZip     string      `json:"shipping_zip"`
	Subtotal        float64     `json:"subtotal"`
	ShippingCost    float64     `json:"shipping_cost"`
	Discount        float64     `json:"discount"`
	Total           float64     `json:"total"`
	Notes           *string     `json:"notes"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	Items           []OrderItem `json:"items,omitempty"`
}

type OrderItem struct {
	ID           uint64    `json:"id"`
	OrderID      uint64    `json:"order_id"`
	ProductID    *uint64   `json:"product_id"`
	ProductName  string    `json:"product_name"`
	ProductImage *string   `json:"product_image"`
	Price        float64   `json:"price"`
	Quantity     int       `json:"quantity"`
	Total        float64   `json:"total"`
	CreatedAt    time.Time `json:"created_at"`
}

// NullableString helps scan nullable strings from DB
func NullStringToPtr(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

func NullFloat64ToPtr(nf sql.NullFloat64) *float64 {
	if nf.Valid {
		return &nf.Float64
	}
	return nil
}

func NullInt64ToUint64Ptr(ni sql.NullInt64) *uint64 {
	if ni.Valid {
		v := uint64(ni.Int64)
		return &v
	}
	return nil
}
