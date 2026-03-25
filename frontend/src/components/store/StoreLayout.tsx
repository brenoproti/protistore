import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, MessageCircle, Package, Settings, LayoutDashboard, Palette, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useStore } from '@/contexts/StoreContext';

/** Returns true if a hex color is "dark" (text on top should be white). */
function isDark(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
}

export function StoreLayout() {
  const { store, customization } = useStore();
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const headerBg = customization?.header_bg_color || '#ffffff';
  const headerTextColor = isDark(headerBg) ? '#ffffff' : '#1f2937';
  const isAdmin = !!localStorage.getItem('admin_info');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Admin bar */}
      {isAdmin && (
        <div className="bg-gray-900 text-gray-300 text-xs z-50">
          <div className="mx-auto max-w-7xl px-4 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-white flex items-center gap-1">
                <Settings size={11} /> Admin
              </span>
              <a href="/admin" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                <LayoutDashboard size={11} /> Dashboard
              </a>
              <a href="/admin/products" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                <ShoppingBag size={11} /> Produtos
              </a>
              <a href="/admin/customization" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">
                <Palette size={11} /> Personalizar
              </a>
            </div>
            <a href="/admin" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Painel completo →
            </a>
          </div>
        </div>
      )}

      <header
        className="sticky top-0 z-50 border-b"
        style={{
          backgroundColor: headerBg,
          color: headerTextColor,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)',
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-4">
            <button
              className="btn btn-ghost btn-icon md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to="/" className="flex items-center gap-2.5 group">
              {store?.logo_url ? (
                <img src={store.logo_url} alt={store?.name || ''} className="h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105" />
              ) : (
                <span className="text-xl font-bold tracking-tight" style={{ color: headerTextColor }}>{store?.name}</span>
              )}
            </Link>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <Link to="/" className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${pathname === '/' ? 'bg-black/10 font-semibold' : 'hover:bg-black/5'}`} style={{ color: 'inherit' }}>
              Início
            </Link>
            <Link to="/products" className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${pathname.startsWith('/products') ? 'bg-black/10 font-semibold' : 'hover:bg-black/5'}`} style={{ color: 'inherit' }}>
              Produtos
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="relative hidden sm:block">
              <label htmlFor="header-search" className="sr-only">Buscar produtos</label>
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <input
                id="header-search"
                type="search"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="input pl-9 bg-muted/50 border-transparent hover:border-border focus:border-primary focus:bg-card"
                style={{ width: searchFocused ? '18rem' : '13rem', transition: 'width 300ms ease, border-color 200ms ease, background-color 200ms ease' }}
              />
            </form>
            <Link to="/cart" className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-black/5 transition-colors duration-200 group/cart">
              <ShoppingCart size={20} className="transition-transform duration-200 group-hover/cart:scale-110" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-scale-in">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t px-4 py-3 md:hidden animate-in">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <label htmlFor="mobile-search" className="sr-only">Buscar produtos</label>
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="mobile-search"
                  type="search"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input pl-9"
                />
              </div>
            </form>
            <nav className="flex flex-col gap-0.5">
              <Link to="/" className="py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>Início</Link>
              <Link to="/products" className="py-2.5 px-3 rounded-lg text-sm font-medium hover:bg-muted transition-colors" onClick={() => setMenuOpen(false)}>Produtos</Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer
        className="mt-auto"
        style={{
          backgroundColor: customization?.footer_bg_color || '#1f2937',
          color: '#ffffff',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="mb-3 text-lg font-bold">{store?.name}</h3>
              {store?.description && (
                <p className="text-sm leading-relaxed opacity-70">{store.description}</p>
              )}
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest opacity-50">Links Rápidos</h4>
              <div className="flex flex-col gap-2">
                <Link to="/" className="text-sm opacity-70 hover:opacity-100 transition-opacity w-fit">Início</Link>
                <Link to="/products" className="text-sm opacity-70 hover:opacity-100 transition-opacity w-fit">Produtos</Link>
                <Link to="/rastreio" className="text-sm opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1.5 w-fit">
                  <Package size={14} /> Rastrear Pedido
                </Link>
              </div>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest opacity-50">Contato</h4>
              <p className="text-sm leading-relaxed opacity-70">Dúvidas? Entre em contato conosco a qualquer momento.</p>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 text-center text-xs opacity-40">
            &copy; {new Date().getFullYear()} {store?.name}. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* WhatsApp FAB */}
      {store?.whatsapp_number && (
        <a
          href={`https://wa.me/${store.whatsapp_number}?text=${encodeURIComponent('Olá! Vim pela loja online e gostaria de mais informações.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/40 active:scale-95"
          aria-label="Fale conosco pelo WhatsApp"
        >
          <MessageCircle size={28} />
        </a>
      )}
    </div>
  );
}
