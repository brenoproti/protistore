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
  children?: Category[];
}

export interface Brand {
  id: number;
  store_id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

export interface ProductImage {
  id: number;
  product_id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
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
  images: ProductImage[];
  category?: Category;
  brand?: Brand;
  created_at: string;
  updated_at: string;
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
}

export interface Order {
  id: number;
  store_id: number;
  order_number: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  notes: string | null;
  delivery_method: 'pickup' | 'delivery';
  payment_method: 'credit_card' | 'debit_card' | 'cash' | 'pix' | 'pay_on_pickup';
  change_for: number | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CartItem {
  product_id: number;
  product: Product;
  quantity: number;
}

export interface DashboardMetrics {
  total_orders: number;
  total_revenue: number;
  total_products: number;
  total_customers: number;
  recent_orders: {
    id: number;
    order_number: string;
    customer: string;
    total: number;
    status: string;
    created_at: string;
  }[];
  top_products: {
    id: number;
    name: string;
    image_url: string | null;
    sold: number;
    revenue: number;
  }[];
  chart_data: {
    date: string;
    orders: number;
    revenue: number;
  }[];
  orders_by_status: Record<string, number>;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  admin: {
    id: number;
    name: string;
    email: string;
  };
}
