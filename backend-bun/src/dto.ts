/**
 * Public DTOs — explicit field lists for public API responses.
 * Adding a column to the DB table does NOT auto-expose it; you must add it here.
 */

import type { Store, StoreCustomization, Category, Brand, Product, ProductImage, Banner, Order, OrderItem } from "./types";

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export interface PublicStoreDTO {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
}

export function toPublicStore(s: Store): PublicStoreDTO {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    logo_url: s.logo_url,
    favicon_url: s.favicon_url,
    whatsapp_number: s.whatsapp_number,
    is_active: s.is_active,
  };
}

export interface PublicStoreCustomizationDTO {
  primary_color: string;
  header_bg_color: string;
  footer_bg_color: string;
}

export function toPublicCustomization(c: StoreCustomization): PublicStoreCustomizationDTO {
  return {
    primary_color: c.primary_color,
    header_bg_color: c.header_bg_color,
    footer_bg_color: c.footer_bg_color,
  };
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export interface PublicCategoryDTO {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  children?: PublicCategoryDTO[];
}

export function toPublicCategory(c: Category): PublicCategoryDTO {
  return {
    id: c.id,
    parent_id: c.parent_id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image_url: c.image_url,
    sort_order: c.sort_order,
    children: c.children?.map(toPublicCategory),
  };
}

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export interface PublicBrandDTO {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
}

export function toPublicBrand(b: Brand): PublicBrandDTO {
  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    logo_url: b.logo_url,
  };
}

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export interface PublicProductImageDTO {
  id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
}

export interface PublicProductDTO {
  id: number;
  category_id: number | null;
  brand_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  stock: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  images?: PublicProductImageDTO[];
}

export function toPublicProductImage(img: ProductImage): PublicProductImageDTO {
  return {
    id: img.id,
    url: img.url,
    alt_text: img.alt_text,
    sort_order: img.sort_order,
  };
}

export function toPublicProduct(p: Product): PublicProductDTO {
  return {
    id: p.id,
    category_id: p.category_id,
    brand_id: p.brand_id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: p.price,
    compare_at_price: p.compare_at_price,
    stock: p.stock,
    is_active: p.is_active,
    is_featured: p.is_featured,
    created_at: p.created_at,
    updated_at: p.updated_at,
    images: p.images?.map(toPublicProductImage),
  };
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

export interface PublicBannerDTO {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number;
}

export function toPublicBanner(b: Banner): PublicBannerDTO {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    image_url: b.image_url,
    link_url: b.link_url,
    sort_order: b.sort_order,
  };
}

// ---------------------------------------------------------------------------
// Order (public confirmation after checkout)
// ---------------------------------------------------------------------------

export interface PublicOrderItemDTO {
  product_name: string;
  product_image: string | null;
  price: number;
  quantity: number;
  total: number;
}

export interface OrderConfirmationDTO {
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  shipping_neighborhood: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  delivery_method: string;
  payment_method: string;
  change_for: number | null;
  created_at: string;
  updated_at: string;
  items?: PublicOrderItemDTO[];
}

export function toOrderConfirmation(o: Order): OrderConfirmationDTO {
  return {
    order_number: o.order_number,
    status: o.status,
    customer_name: o.customer_name,
    customer_email: o.customer_email,
    shipping_address: o.shipping_address,
    shipping_neighborhood: o.shipping_neighborhood,
    shipping_city: o.shipping_city,
    shipping_state: o.shipping_state,
    shipping_zip: o.shipping_zip,
    subtotal: o.subtotal,
    shipping_cost: o.shipping_cost,
    discount: o.discount,
    total: o.total,
    delivery_method: o.delivery_method,
    payment_method: o.payment_method,
    change_for: o.change_for,
    created_at: o.created_at,
    updated_at: o.updated_at,
    items: o.items?.map(toPublicOrderItem),
  };
}

function toPublicOrderItem(i: OrderItem): PublicOrderItemDTO {
  return {
    product_name: i.product_name,
    product_image: i.product_image,
    price: i.price,
    quantity: i.quantity,
    total: i.total,
  };
}

// ---------------------------------------------------------------------------
// Order tracking (minimal, for GET /store/orders)
// ---------------------------------------------------------------------------

export interface OrderTrackingDTO {
  order_number: string;
  status: string;
  delivery_method: string;
  created_at: string;
  updated_at: string;
}

export function toOrderTracking(o: Order): OrderTrackingDTO {
  return {
    order_number: o.order_number,
    status: o.status,
    delivery_method: o.delivery_method,
    created_at: o.created_at,
    updated_at: o.updated_at,
  };
}
