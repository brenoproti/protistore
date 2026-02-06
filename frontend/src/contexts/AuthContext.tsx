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
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'admin_access_token',
  REFRESH_TOKEN: 'admin_refresh_token',
  ADMIN: 'admin_info',
} as const;

function parseJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const expiry = parseJwtExpiry(token);
  if (!expiry) return true;
  // Consider token expired 30 seconds before actual expiry
  return Date.now() >= expiry - 30_000;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session from localStorage and validate tokens
  useEffect(() => {
    try {
      const storedAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const storedAdmin = localStorage.getItem(STORAGE_KEYS.ADMIN);

      if (storedAccessToken && storedAdmin) {
        // Check if access token is still valid
        if (!isTokenExpired(storedAccessToken)) {
          setAccessToken(storedAccessToken);
          setAdmin(JSON.parse(storedAdmin));
          // Validate token against current store (backend will 401 if mismatch)
          adminStoreApi.getStore().catch(() => {
            clearSession();
            if (window.location.pathname.startsWith('/admin')) {
              window.location.href = '/admin/login';
            }
          });
        } else if (storedRefreshToken && !isTokenExpired(storedRefreshToken)) {
          // Access token expired but refresh token is valid -- attempt refresh
          authApi.refresh(storedRefreshToken)
            .then((data: LoginResponse) => {
              persistSession(data);
              setAccessToken(data.access_token);
              setAdmin(data.admin);
            })
            .catch(() => {
              clearSession();
              if (window.location.pathname.startsWith('/admin')) {
                window.location.href = '/admin/login';
              }
            });
        } else {
          // Both tokens expired
          clearSession();
        }
      }
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, []);

  function persistSession(data: LoginResponse) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
    localStorage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(data.admin));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ADMIN);
    setAccessToken(null);
    setAdmin(null);
  }

  const login = useCallback(async (email: string, password: string) => {
    const data: LoginResponse = await authApi.login(email, password);
    persistSession(data);
    setAccessToken(data.access_token);
    setAdmin(data.admin);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  const isAuthenticated = !!accessToken && !!admin;

  return (
    <AuthContext.Provider value={{ admin, accessToken, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
