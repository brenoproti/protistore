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
 * A subdomain like "vibestore.localhost" or "myshop.example.com" means there is one.
 */
export function hasStoreSubdomain(): boolean {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  return parts.length > 1 && parts[0] !== 'www';
}

/**
 * Derive the store slug from the current hostname.
 *
 * Returns the subdomain portion (e.g. "vibestore" from "vibestore.localhost"),
 * or `null` when there is no subdomain.
 */
function getStoreSlug(): string | null {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  if (parts.length > 1 && parts[0] !== 'www') {
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
});

// ---- Request interceptor ----------------------------------------------------

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Attach bearer token when available
  const token = localStorage.getItem('admin_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach store slug header for store-scoped requests
  const slug = getStoreSlug();
  if (slug) {
    config.headers['X-Store-Slug'] = slug;
  }

  return config;
});

// ---- Force logout on auth failure -------------------------------------------

function forceLogout() {
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
  localStorage.removeItem('admin_info');
  // Redirect to login if on an admin page
  if (window.location.pathname.startsWith('/admin')) {
    window.location.href = '/admin/login';
  }
}

// ---- Response interceptor (handle 401 / token refresh) ----------------------

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
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

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('admin_refresh_token');

      if (!refreshToken) {
        // No refresh token – clear everything and redirect to login
        forceLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Another refresh is already in-flight – queue this request
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ access_token: string }>('/api/v1/auth/refresh', {
          refresh_token: refreshToken,
        });

        const newToken = data.access_token;
        localStorage.setItem('admin_access_token', newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
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
    shipping_city?: string;
    shipping_state?: string;
    shipping_zip?: string;
    notes?: string;
    delivery_method: 'pickup' | 'delivery';
    payment_method: 'credit_card' | 'debit_card' | 'cash' | 'pix' | 'pay_on_pickup';
    change_for?: number;
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
  /** Admin login. */
  login(email: string, password: string) {
    return api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data);
  },

  /** Refresh access token. */
  refresh(refreshToken: string) {
    return api.post<LoginResponse>('/auth/refresh', { refresh_token: refreshToken }).then((r) => r.data);
  },

  /** Logout (invalidate tokens server-side). */
  logout() {
    return api.post('/auth/logout').then((r) => r.data);
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

  exportProducts(format: 'csv' | 'xlsx' = 'csv') {
    return api
      .get('/admin/products/export', {
        params: { format },
        responseType: 'blob',
      })
      .then((r) => {
        const ext = format === 'xlsx' ? 'xlsx' : 'csv';
        const blob = new Blob([r.data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `produtos.${ext}`;
        a.click();
        window.URL.revokeObjectURL(url);
      });
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

  /** Upload a file (image). Tries S3 presigned upload first, falls back to local upload. */
  async uploadFile(file: File): Promise<{ url: string }> {
    try {
      // Try presigned S3 upload
      const { data: presign } = await api.post<{ upload_url: string; file_url: string }>(
        '/admin/presign',
        { filename: file.name, content_type: file.type },
      );

      // Upload directly to S3
      await fetch(presign.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      return { url: presign.file_url };
    } catch {
      // Fallback to local upload
      const formData = new FormData();
      formData.append('file', file);
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
