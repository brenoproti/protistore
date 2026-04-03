// --- Models ---

export interface Store {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreCustomization {
  id: number;
  store_id: number;
  primary_color: string;
  header_bg_color: string;
  footer_bg_color: string;
  created_at: string;
  updated_at: string;
}

export interface StoreAdmin {
  id: number;
  store_id: number;
  name: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  store_id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

export interface Brand {
  id: number;
  store_id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  store_id: number;
  category_id: number | null;
  brand_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  sku: string | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  images?: ProductImage[];
  category?: Category;
  brand?: Brand;
}

export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
}

export interface Banner {
  id: number;
  store_id: number;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  store_id: number;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  shipping_neighborhood: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  notes: string | null;
  delivery_method: string;
  payment_method: string;
  change_for: number | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  total: number;
  created_at: string;
}

// --- DTOs ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  admin: { id: number; name: string; email: string };
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export interface UpdateStoreRequest {
  name: string;
  description?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  whatsapp_number?: string | null;
}

export interface UpdateCustomizationRequest {
  primary_color: string;
  header_bg_color: string;
  footer_bg_color: string;
}

export interface CategoryRequest {
  name: string;
  slug: string;
  parent_id?: number | null;
  description?: string | null;
  image_url?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface BrandRequest {
  name: string;
  slug: string;
  logo_url?: string | null;
  is_active: boolean;
}

export interface ProductRequest {
  name: string;
  slug: string;
  category_id?: number | null;
  brand_id?: number | null;
  description?: string | null;
  price: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  sku?: string | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  images?: ImageRequest[];
}

export interface ImageRequest {
  url: string;
  alt_text?: string | null;
  sort_order: number;
}

export interface BannerRequest {
  title: string;
  subtitle?: string | null;
  image_url: string;
  link_url?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CartItem {
  product_id: number;
  quantity: number;
}

export interface CartValidationRequest {
  items: CartItem[];
}

export interface CartValidatedItem {
  product_id: number;
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  stock: number;
  available: boolean;
}

export interface CartValidationResponse {
  items: CartValidatedItem[];
  valid: boolean;
}

export interface CheckoutRequest {
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  shipping_address: string;
  shipping_neighborhood: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  notes?: string | null;
  delivery_method: string;
  payment_method: string;
  change_for?: number | null;
  privacy_accepted?: boolean;
  items: CartItem[];
}

export interface UpdateOrderStatusRequest {
  status: string;
}

export interface ProductListParams {
  page: number;
  per_page: number;
  search?: string;
  category_id?: number;
  brand_id?: number;
  brand_ids?: number[];
  min_price?: number;
  max_price?: number;
  sort?: string;
  order?: string;
  featured?: boolean;
  active?: boolean;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DashboardMetrics {
  total_orders: number;
  total_revenue: number;
  total_products: number;
  total_customers: number;
  recent_orders: DashboardOrder[];
  top_products: TopProduct[];
  chart_data: ChartDataPoint[];
  orders_by_status: Record<string, number>;
}

export interface DashboardOrder {
  id: number;
  order_number: string;
  customer: string;
  total: number;
  status: string;
  created_at: string;
}

export interface TopProduct {
  id: number;
  name: string;
  image_url: string | null;
  sold: number;
  revenue: number;
}

export interface ChartDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: string;
}

export interface UploadResponse {
  url: string;
}

export interface PresignRequestBody {
  filename: string;
  content_type: string;
}

export interface PresignResponse {
  upload_url: string;
  file_url: string;
}

export interface ImportResult {
  total: number;
  created: number;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  message: string;
}
