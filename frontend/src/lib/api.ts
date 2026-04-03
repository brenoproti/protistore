import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  Store,
  StoreCustomization,
  Category,
  Brand,
  Product,
  Banner,
  Order,
  PaginatedResponse,
  DashboardMetrics,
  LoginResponse,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether the current hostname contains a store subdomain.
 *
 * A bare hostname like "localhost" or "example.com" means no store subdomain.
 * A subdomain like "protistore.localhost" or "myshop.example.com" means there is one.
 */
export function hasStoreSubdomain(): boolean {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  // localhost: "myshop.localhost" → 2 parts = subdomain
  // production: "myshop.protistore.com" → 3 parts = subdomain
  //             "protistore.com" → 2 parts = no subdomain
  const isLocalhost = parts[parts.length - 1] === 'localhost';
  const minParts = isLocalhost ? 2 : 3;
  return parts.length >= minParts && parts[0] !== 'www';
}

/**
 * Derive the store slug from the current hostname.
 *
 * Returns the subdomain portion (e.g. "protistore" from "protistore.localhost"),
 * or `null` when there is no subdomain.
 */
function getStoreSlug(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  const isLocalhost = parts[parts.length - 1] === 'localhost';
  const minParts = isLocalhost ? 2 : 3;

  if (parts.length >= minParts && parts[0] !== 'www') {
    return parts[0];
  }

  return null;
}

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ---- Request interceptor ----------------------------------------------------

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Attach store slug header for store-scoped requests
  const slug = getStoreSlug();
  if (slug) {
    config.headers['X-Store-Slug'] = slug;
  }

  return config;
});

// ---- Force logout on auth failure -------------------------------------------

function forceLogout() {
  localStorage.removeItem('admin_info');
  // Also clear legacy tokens if present
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
  // Redirect to login if on an admin page
  if (window.location.pathname.startsWith('/admin')) {
    window.location.href = '/admin/login';
  }
}

// ---- Response interceptor (handle 401 / token refresh) ----------------------

let isRefreshing = false;
let failedQueue: { resolve: () => void; reject: (err: unknown) => void }[] = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (!error) {
      prom.resolve();
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      if (isRefreshing) {
        // Another refresh is already in-flight – queue this request
        return new Promise<void>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token is sent automatically via httpOnly cookie.
        // Use the configured `api` instance so X-Store-Slug is attached.
        await api.post('/auth/refresh', {});

        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ===========================================================================
// Store (public) API
// ===========================================================================

export const storeApi = {
  /** Get store information + customization for the current slug. */
  getInfo() {
    return api.get<{ store: Store; customization: StoreCustomization }>('/store/info').then((r) => r.data);
  },

  /** Get all active categories (with nested children). */
  getCategories() {
    return api.get<Category[]>('/store/categories').then((r) => r.data);
  },

  /** Get all active brands. */
  getBrands() {
    return api.get<Brand[]>('/store/brands').then((r) => r.data);
  },

  /** Get paginated products with optional filters. */
  getProducts(params?: Record<string, unknown>) {
    return api.get<PaginatedResponse<Product>>('/store/products', { params }).then((r) => r.data);
  },

  /** Get a single product by its slug. */
  getProductBySlug(slug: string) {
    return api.get<{ product: Product; related: Product[] }>(`/store/products/${slug}`).then((r) => r.data);
  },

  /** Get active banners. */
  getBanners() {
    return api.get<Banner[]>('/store/banners').then((r) => r.data);
  },

  /** Validate cart items. */
  validateCart(items: { product_id: number; quantity: number }[]) {
    return api.post('/store/cart', { items }).then((r) => r.data);
  },

  /** Submit an order (checkout). */
  checkout(data: {
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
    shipping_address?: string;
    shipping_neighborhood?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_zip?: string;
    notes?: string;
    delivery_method: 'pickup' | 'delivery';
    payment_method: 'credit_card' | 'debit_card' | 'cash' | 'pix' | 'pay_on_pickup';
    change_for?: number;
    privacy_accepted: boolean;
    items: { product_id: number; quantity: number }[];
  }) {
    return api.post<Order>('/store/orders', data).then((r) => r.data);
  },

  /** Look up an order by its order number. */
  getOrderByNumber(orderNumber: string) {
    return api.get<Order>('/store/orders', { params: { order_number: orderNumber } }).then((r) => r.data);
  },
};

// ===========================================================================
// Auth API
// ===========================================================================

export const authApi = {
  /** Admin login. Cookies are set by the server. */
  login(email: string, password: string) {
    return api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data);
  },

  /** Refresh access token. Refresh token cookie is sent automatically. */
  refresh() {
    return api.post<LoginResponse>('/auth/refresh', {}).then((r) => r.data);
  },

  /** Logout (revokes refresh token and clears cookies server-side). */
  logout() {
    return api.post('/auth/logout', {}).then((r) => r.data);
  },
};

// ===========================================================================
// Admin API – Store & Customization
// ===========================================================================

export const adminStoreApi = {
  /** Get the admin's own store. */
  getStore() {
    return api.get<Store>('/admin/store').then((r) => r.data);
  },

  /** Update store settings. */
  updateStore(data: Partial<Store>) {
    return api.put<Store>('/admin/store', data).then((r) => r.data);
  },

  /** Get store customization / theme. */
  getCustomization() {
    return api.get<StoreCustomization>('/admin/customization').then((r) => r.data);
  },

  /** Update store customization / theme. */
  updateCustomization(data: Partial<StoreCustomization>) {
    return api.put<StoreCustomization>('/admin/customization', data).then((r) => r.data);
  },
};

// ===========================================================================
// Admin API – Categories CRUD
// ===========================================================================

export const adminCategoryApi = {
  list(params?: Record<string, unknown>) {
    return api.get<Category[]>('/admin/categories', { params }).then((r) => r.data);
  },

  get(id: number) {
    return api.get<Category>(`/admin/categories/${id}`).then((r) => r.data);
  },

  create(data: Partial<Category>) {
    return api.post<Category>('/admin/categories', data).then((r) => r.data);
  },

  update(id: number, data: Partial<Category>) {
    return api.put<Category>(`/admin/categories/${id}`, data).then((r) => r.data);
  },

  delete(id: number) {
    return api.delete(`/admin/categories/${id}`).then((r) => r.data);
  },
};

// ===========================================================================
// Admin API – Brands CRUD
// ===========================================================================

export const adminBrandApi = {
  list(params?: Record<string, unknown>) {
    return api.get<Brand[]>('/admin/brands', { params }).then((r) => r.data);
  },

  get(id: number) {
    return api.get<Brand>(`/admin/brands/${id}`).then((r) => r.data);
  },

  create(data: Partial<Brand>) {
    return api.post<Brand>('/admin/brands', data).then((r) => r.data);
  },

  update(id: number, data: Partial<Brand>) {
    return api.put<Brand>(`/admin/brands/${id}`, data).then((r) => r.data);
  },

  delete(id: number) {
    return api.delete(`/admin/brands/${id}`).then((r) => r.data);
  },
};

// ===========================================================================
// Admin API – Products CRUD
// ===========================================================================

export interface ImportResult {
  total: number;
  created: number;
  errors: { row: number; message: string }[];
}

export const adminProductApi = {
  list(params?: Record<string, unknown>) {
    return api.get<PaginatedResponse<Product>>('/admin/products', { params }).then((r) => r.data);
  },

  get(id: number) {
    return api.get<Product>(`/admin/products/${id}`).then((r) => r.data);
  },

  create(data: Partial<Product>) {
    return api.post<Product>('/admin/products', data).then((r) => r.data);
  },

  update(id: number, data: Partial<Product>) {
    return api.put<Product>(`/admin/products/${id}`, data).then((r) => r.data);
  },

  delete(id: number) {
    return api.delete(`/admin/products/${id}`).then((r) => r.data);
  },

  importProducts(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post<ImportResult>('/admin/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

};

// ===========================================================================
// Admin API – Banners CRUD
// ===========================================================================

export const adminBannerApi = {
  list(params?: Record<string, unknown>) {
    return api.get<Banner[]>('/admin/banners', { params }).then((r) => r.data);
  },

  get(id: number) {
    return api.get<Banner>(`/admin/banners/${id}`).then((r) => r.data);
  },

  create(data: Partial<Banner>) {
    return api.post<Banner>('/admin/banners', data).then((r) => r.data);
  },

  update(id: number, data: Partial<Banner>) {
    return api.put<Banner>(`/admin/banners/${id}`, data).then((r) => r.data);
  },

  delete(id: number) {
    return api.delete(`/admin/banners/${id}`).then((r) => r.data);
  },
};

// ===========================================================================
// Admin API – Orders CRUD
// ===========================================================================

export const adminOrderApi = {
  list(params?: Record<string, unknown>) {
    return api.get<PaginatedResponse<Order>>('/admin/orders', { params }).then((r) => r.data);
  },

  get(id: number) {
    return api.get<Order>(`/admin/orders/${id}`).then((r) => r.data);
  },

  updateStatus(id: number, status: string) {
    return api.put<Order>(`/admin/orders/${id}/status`, { status }).then((r) => r.data);
  },
};

// ===========================================================================
// Admin API – Dashboard & Uploads
// ===========================================================================

export const adminApi = {
  /** Fetch dashboard metrics. */
  getDashboard() {
    return api.get<DashboardMetrics>('/admin/dashboard').then((r) => r.data);
  },

  /** Convert an image file to WebP format for smaller file sizes. */
  async convertToWebP(file: File, quality = 0.85): Promise<File> {
    if (file.type === 'image/webp' || file.type === 'image/svg+xml' || file.type === 'image/gif') {
      return file;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('WebP conversion failed'));
            const name = file.name.replace(/\.[^.]+$/, '.webp');
            resolve(new File([blob], name, { type: 'image/webp' }));
          },
          'image/webp',
          quality,
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  },

  /** Upload a file (image). Converts to WebP first, tries S3 presigned upload, falls back to local. */
  async uploadFile(file: File): Promise<{ url: string }> {
    const converted = await this.convertToWebP(file);

    try {
      // Try presigned S3 upload
      const { data: presign } = await api.post<{ upload_url: string; file_url: string }>(
        '/admin/presign',
        { filename: converted.name, content_type: converted.type },
      );

      // Upload directly to S3
      await fetch(presign.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': converted.type },
        body: converted,
      });

      return { url: presign.file_url };
    } catch {
      // Fallback to local upload
      const formData = new FormData();
      formData.append('file', converted);
      return api
        .post<{ url: string }>('/admin/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data);
    }
  },
};

// ===========================================================================
// Platform API (no tenant required)
// ===========================================================================

export const platformApi = {
  /** List all active stores on the platform. */
  listStores() {
    return axios.get<Store[]>('/api/v1/stores').then((r) => r.data);
  },
};

// ---------------------------------------------------------------------------
// Default export – the raw axios instance for advanced use-cases
// ---------------------------------------------------------------------------

export default api;
