import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { storeApi } from '@/lib/api';
import type { Store, StoreCustomization } from '@/types';

interface StoreContextType {
  store: Store | null;
  customization: StoreCustomization | null;
  loading: boolean;
  error: string | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

function darkenColor(hex: string, amount = 15): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function applyCustomization(customization: StoreCustomization) {
  const root = document.documentElement;
  root.style.setProperty('--store-primary', customization.primary_color);
  root.style.setProperty('--store-accent', customization.accent_color);
  root.style.setProperty('--store-primary-hover', darkenColor(customization.primary_color));

}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store | null>(null);
  const [customization, setCustomization] = useState<StoreCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStoreInfo() {
      try {
        const { store, customization } = await storeApi.getInfo();

        if (cancelled) return;

        setStore(store);
        setCustomization(customization);

        // Apply theme customization as CSS variables
        applyCustomization(customization);

        // Set document title
        document.title = store.name;

        // Set favicon if available
        if (store.favicon_url) {
          let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = store.favicon_url;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar informações da loja');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStoreInfo();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    const { protocol, hostname, port } = window.location;
    const parts = hostname.split('.');
    const rootHostname = parts[parts.length - 1] === 'localhost'
      ? 'localhost'
      : parts.slice(1).join('.');
    const portSuffix = port ? `:${port}` : '';
    window.location.replace(`${protocol}//${rootHostname}${portSuffix}`);
    return null;
  }

  return (
    <StoreContext.Provider value={{ store, customization, loading, error }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve ser usado dentro de StoreProvider');
  return ctx;
}
