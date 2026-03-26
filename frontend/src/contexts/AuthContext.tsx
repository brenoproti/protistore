import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { authApi, adminStoreApi } from '@/lib/api';
import type { LoginResponse } from '@/types';

interface Admin {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_STORAGE_KEY = 'admin_info';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a valid session (cookies are sent automatically)
  // The Axios interceptor handles 401 → refresh automatically, so we just need to
  // call a protected endpoint. If both access + refresh are invalid, it will fail.
  useEffect(() => {
    const storedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!storedAdmin) {
      setLoading(false);
      return;
    }

    adminStoreApi.getStore()
      .then(() => {
        setAdmin(JSON.parse(storedAdmin));
      })
      .catch(() => {
        // Interceptor already tried refresh and failed — session is truly expired
        clearSession();
      })
      .finally(() => setLoading(false));
  }, []);

  function clearSession() {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    // Also clear legacy tokens if present
    localStorage.removeItem('admin_access_token');
    localStorage.removeItem('admin_refresh_token');
    setAdmin(null);
  }

  const login = useCallback(async (email: string, password: string) => {
    const data: LoginResponse = await authApi.login(email, password);
    // Cookies are set by the server; only store non-sensitive admin info locally
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data.admin));
    setAdmin(data.admin);
  }, []);

  const logout = useCallback(() => {
    authApi.logout().catch(() => {});
    clearSession();
  }, []);

  const isAuthenticated = !!admin;

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
