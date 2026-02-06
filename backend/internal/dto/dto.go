package dto

type ErrorResponse struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	Admin        AdminInfo `json:"admin"`
}

type AdminInfo struct {
	ID    uint64 `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type RefreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type UpdateStoreRequest struct {
	Name           string  `json:"name"`
	Description    *string `json:"description"`
	LogoURL        *string `json:"logo_url"`
	FaviconURL     *string `json:"favicon_url"`
	WhatsappNumber *string `json:"whatsapp_number"`
}

type UpdateCustomizationRequest struct {
	PrimaryColor    string  `json:"primary_color"`
	SecondaryColor  string  `json:"secondary_color"`
	AccentColor     string  `json:"accent_color"`
	BackgroundColor string  `json:"background_color"`
	TextColor       string  `json:"text_color"`
	HeaderBgColor   string  `json:"header_bg_color"`
	FooterBgColor   string  `json:"footer_bg_color"`
	FontFamily      string  `json:"font_family"`
	BorderRadius    string  `json:"border_radius"`
	CustomCSS       *string `json:"custom_css"`
}

type CategoryRequest struct {
	Name        string  `json:"name"`
	Slug        string  `json:"slug"`
	ParentID    *uint64 `json:"parent_id"`
	Description *string `json:"description"`
	ImageURL    *string `json:"image_url"`
	SortOrder   int     `json:"sort_order"`
	IsActive    bool    `json:"is_active"`
}

type BrandRequest struct {
	Name     string  `json:"name"`
	Slug     string  `json:"slug"`
	LogoURL  *string `json:"logo_url"`
	IsActive bool    `json:"is_active"`
}

type ProductRequest struct {
	Name           string         `json:"name"`
	Slug           string         `json:"slug"`
	CategoryID     *uint64        `json:"category_id"`
	BrandID        *uint64        `json:"brand_id"`
	Description    *string        `json:"description"`
	Price          float64        `json:"price"`
	CompareAtPrice *float64       `json:"compare_at_price"`
	CostPrice      *float64       `json:"cost_price"`
	SKU            *string        `json:"sku"`
	Stock          int            `json:"stock"`
	IsActive       bool           `json:"is_active"`
	IsFeatured     bool           `json:"is_featured"`
	Images         []ImageRequest `json:"images"`
}

type ImageRequest struct {
	URL       string  `json:"url"`
	AltText   *string `json:"alt_text"`
	SortOrder int     `json:"sort_order"`
}

type BannerRequest struct {
	Title    string  `json:"title"`
	Subtitle *string `json:"subtitle"`
	ImageURL string  `json:"image_url"`
	LinkURL  *string `json:"link_url"`
	SortOrder int    `json:"sort_order"`
	IsActive bool    `json:"is_active"`
}

type CartItem struct {
	ProductID uint64 `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type CartValidationRequest struct {
	Items []CartItem `json:"items"`
}

type CartValidatedItem struct {
	ProductID    uint64  `json:"product_id"`
	ProductName  string  `json:"product_name"`
	ProductImage *string `json:"product_image"`
	Price        float64 `json:"price"`
	Quantity     int     `json:"quantity"`
	Stock        int     `json:"stock"`
	Available    bool    `json:"available"`
}

type CartValidationResponse struct {
	Items []CartValidatedItem `json:"items"`
	Valid bool                `json:"valid"`
}

type CheckoutRequest struct {
	CustomerName    string     `json:"customer_name"`
	CustomerEmail   string     `json:"customer_email"`
	CustomerPhone   *string    `json:"customer_phone"`
	ShippingAddress string     `json:"shipping_address"`
	ShippingCity    string     `json:"shipping_city"`
	ShippingState   string     `json:"shipping_state"`
	ShippingZip     string     `json:"shipping_zip"`
	Notes           *string    `json:"notes"`
	Items           []CartItem `json:"items"`
}

type UpdateOrderStatusRequest struct {
	Status string `json:"status"`
}

type ProductListParams struct {
	Page       int
	PerPage    int
	Search     string
	CategoryID *uint64
	BrandID    *uint64
	MinPrice   *float64
	MaxPrice   *float64
	Sort       string
	Order      string
	Featured   *bool
	Active     *bool
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PerPage    int         `json:"per_page"`
	TotalPages int         `json:"total_pages"`
}

type DashboardMetrics struct {
	TotalOrders    int64              `json:"total_orders"`
	TotalRevenue   float64            `json:"total_revenue"`
	TotalProducts  int64              `json:"total_products"`
	TotalCustomers int64              `json:"total_customers"`
	RecentOrders   []DashboardOrder   `json:"recent_orders"`
	TopProducts    []TopProduct       `json:"top_products"`
	ChartData      []ChartDataPoint   `json:"chart_data"`
	OrdersByStatus map[string]int64   `json:"orders_by_status"`
}

type DashboardOrder struct {
	ID          uint64  `json:"id"`
	OrderNumber string  `json:"order_number"`
	Customer    string  `json:"customer"`
	Total       float64 `json:"total"`
	Status      string  `json:"status"`
	CreatedAt   string  `json:"created_at"`
}

type TopProduct struct {
	ID        uint64  `json:"id"`
	Name      string  `json:"name"`
	ImageURL  *string `json:"image_url"`
	Sold      int64   `json:"sold"`
	Revenue   float64 `json:"revenue"`
}

type ChartDataPoint struct {
	Date   string  `json:"date"`
	Orders int64   `json:"orders"`
	Revenue float64 `json:"revenue"`
}

type UploadResponse struct {
	URL string `json:"url"`
}
