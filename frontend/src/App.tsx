import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { CartProvider } from '@/contexts/CartContext';
import { StoreProvider } from '@/contexts/StoreContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Store pages
import { StoreLayout } from '@/components/store/StoreLayout';
import HomePage from '@/pages/store/HomePage';
import ProductsPage from '@/pages/store/ProductsPage';
import ProductDetailPage from '@/pages/store/ProductDetailPage';
import { CartPage } from '@/pages/store/CartPage';
import { CheckoutPage } from '@/pages/store/CheckoutPage';
import { OrderConfirmationPage } from '@/pages/store/OrderConfirmationPage';

// Admin pages
import { AdminLayout } from '@/components/admin/AdminLayout';
import { LoginPage } from '@/pages/admin/LoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { ProductsAdminPage } from '@/pages/admin/ProductsPage';
import { ProductFormPage } from '@/pages/admin/ProductFormPage';
import { CategoriesPage } from '@/pages/admin/CategoriesPage';
import { BrandsPage } from '@/pages/admin/BrandsPage';
import { BannersPage } from '@/pages/admin/BannersPage';
import { OrdersPage } from '@/pages/admin/OrdersPage';
import { OrderDetailPage } from '@/pages/admin/OrderDetailPage';
import { CustomizationPage } from '@/pages/admin/CustomizationPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          {/* Admin routes */}
          <Route path="/admin/login" element={
            <AuthProvider><LoginPage /></AuthProvider>
          } />
          <Route path="/admin" element={
            <AuthProvider><AdminLayout /></AuthProvider>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductsAdminPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="brands" element={<BrandsPage />} />
            <Route path="banners" element={<BannersPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="customization" element={<CustomizationPage />} />
          </Route>

          {/* Store routes */}
          <Route path="/" element={
            <StoreProvider>
              <CartProvider>
                <StoreLayout />
              </CartProvider>
            </StoreProvider>
          }>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:slug" element={<ProductDetailPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="checkout" element={<CheckoutPage />} />
            <Route path="order-confirmation" element={<OrderConfirmationPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
