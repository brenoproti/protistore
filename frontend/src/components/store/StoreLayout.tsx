import { Outlet, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';

export function StoreLayout() {
  const { store, customization } = useStore();
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-50 border-b shadow-sm"
        style={{ backgroundColor: customization?.header_bg_color || '#ffffff' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              className="btn btn-ghost btn-icon md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="flex items-center gap-2">
              {store?.logo_url ? (
                <img src={store.logo_url} alt={store.name} className="h-8" />
              ) : (
                <span className="text-xl font-bold text-primary">{store?.name}</span>
              )}
            </Link>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <Link to="/" className="text-sm font-medium hover:text-primary transition-colors">
              Início
            </Link>
            <Link to="/products" className="text-sm font-medium hover:text-primary transition-colors">
              Produtos
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="relative hidden sm:block">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input pl-8 w-48 lg:w-64"
              />
            </form>
            <Link to="/cart" className="btn btn-ghost btn-icon relative">
              <ShoppingCart size={20} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t px-4 py-3 md:hidden">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input pl-8"
                />
              </div>
            </form>
            <nav className="flex flex-col gap-2">
              <Link to="/" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>Início</Link>
              <Link to="/products" className="py-2 text-sm font-medium" onClick={() => setMenuOpen(false)}>Produtos</Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer
        className="mt-auto border-t"
        style={{
          backgroundColor: customization?.footer_bg_color || '#1f2937',
          color: '#ffffff',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="mb-3 text-lg font-semibold">{customization?.store_name || store?.name}</h3>
              {store?.description && (
                <p className="text-sm opacity-75">{store.description}</p>
              )}
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-75">Links Rápidos</h4>
              <div className="flex flex-col gap-1.5">
                <Link to="/" className="text-sm opacity-75 hover:opacity-100 transition-opacity">Início</Link>
                <Link to="/products" className="text-sm opacity-75 hover:opacity-100 transition-opacity">Produtos</Link>
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider opacity-75">Contato</h4>
              <p className="text-sm opacity-75">Dúvidas? Entre em contato conosco a qualquer momento.</p>
            </div>
          </div>
          <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs opacity-50">
            &copy; {new Date().getFullYear()} {customization?.store_name || store?.name}. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
