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

      <div className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-2" style={{ backgroundColor: 'var(--color-background)' }}>
      <header
        className="mx-auto max-w-[1280px] rounded-2xl border"
        style={{
          backgroundColor: headerBg,
          color: headerTextColor,
          boxShadow: '0 2px 8px 0 rgba(0,0,0,0.06), 0 1px 3px -1px rgba(0,0,0,0.05)',
        }}
      >
        <div className="flex items-center gap-4 px-4 sm:px-5 py-3">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 transition-colors duration-200 cursor-pointer"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
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

          {/* Center: search */}
          <form onSubmit={handleSearch} className="relative flex-1 hidden sm:block max-w-xl mx-auto">
            <label htmlFor="header-search" className="sr-only">Buscar produtos</label>
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <input
              id="header-search"
              type="search"
              placeholder="Buscar produtos, marcas, categorias..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground hover:border-border focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </form>

          {/* Right: cart */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/cart" className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 transition-colors duration-200 group/cart">
              <ShoppingCart size={20} className="transition-transform duration-200 group-hover/cart:scale-110" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-scale-in">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Side drawer */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 animate-in" onClick={() => setMenuOpen(false)} />
          <aside className="fixed top-0 left-0 bottom-0 w-72 bg-card z-50 shadow-2xl flex flex-col" style={{ animation: 'slide-in-left 200ms ease-out' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <Link to="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
                {store?.logo_url ? (
                  <img src={store.logo_url} alt={store?.name || ''} className="h-8 w-auto object-contain" />
                ) : (
                  <span className="text-lg font-bold tracking-tight">{store?.name}</span>
                )}
              </Link>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors cursor-pointer"
                aria-label="Fechar menu"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile search */}
            <div className="px-4 pt-4 sm:hidden">
              <form onSubmit={(e) => { handleSearch(e); setMenuOpen(false); }}>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Buscar produtos..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="input pl-9 w-full"
                  />
                </div>
              </form>
            </div>

            <nav className="flex flex-col gap-0.5 px-3 pt-4">
              <Link to="/" className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`} onClick={() => setMenuOpen(false)}>
                Início
              </Link>
              <Link to="/products" className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith('/products') ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`} onClick={() => setMenuOpen(false)}>
                Produtos
              </Link>
              <Link to="/cart" className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${pathname === '/cart' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`} onClick={() => setMenuOpen(false)}>
                Carrinho
              </Link>
              <Link to="/rastreio" className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${pathname === '/rastreio' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`} onClick={() => setMenuOpen(false)}>
                <Package size={16} /> Rastrear Pedido
              </Link>
            </nav>
          </aside>
        </>
      )}
      </div>

      <main className="flex-1 px-4 sm:px-6 lg:px-8">
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
