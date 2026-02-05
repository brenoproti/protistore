import { useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { storeApi } from '@/lib/api';
import type { Category, Brand } from '@/types';
import { ProductCard } from '@/components/store/ProductCard';
import { Select } from '@/components/ui/Select';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { label: 'Mais Recentes', value: 'newest' },
  { label: 'Preço: Menor para Maior', value: 'price_asc' },
  { label: 'Preço: Maior para Menor', value: 'price_desc' },
  { label: 'Nome: A-Z', value: 'name_asc' },
] as const;

const PER_PAGE = 12;

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ProductGridSkeleton({ count = PER_PAGE }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="aspect-square skeleton" />
          <div className="h-4 w-3/4 skeleton" />
          <div className="h-4 w-1/2 skeleton" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar Filters
// ---------------------------------------------------------------------------

interface SidebarProps {
  categories: Category[];
  brands: Brand[];
  activeCategoryId: number | null;
  activeBrandIds: number[];
  priceMin: string;
  priceMax: string;
  onCategorySelect: (id: number | null) => void;
  onBrandToggle: (id: number) => void;
  onPriceMinChange: (value: string) => void;
  onPriceMaxChange: (value: string) => void;
  onClearFilters: () => void;
  onClose?: () => void;
}

function Sidebar({
  categories,
  brands,
  activeCategoryId,
  activeBrandIds,
  priceMin,
  priceMax,
  onCategorySelect,
  onBrandToggle,
  onPriceMinChange,
  onPriceMaxChange,
  onClearFilters,
  onClose,
}: SidebarProps) {
  const hasActiveFilters =
    activeCategoryId !== null ||
    activeBrandIds.length > 0 ||
    priceMin !== '' ||
    priceMax !== '';

  return (
    <aside className="flex flex-col gap-6">
      {/* Mobile close button */}
      {onClose && (
        <div className="flex items-center justify-between lg:hidden">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Categories */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Categorias
        </h3>
        <ul className="flex flex-col gap-1">
          <li>
            <button
              onClick={() => onCategorySelect(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                activeCategoryId === null
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'hover:bg-muted'
              }`}
            >
              Todas as Categorias
            </button>
          </li>
          {categories.map((cat) => (
            <li key={cat.id}>
              <button
                onClick={() => onCategorySelect(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeCategoryId === cat.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-muted'
                }`}
              >
                {cat.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Marcas
          </h3>
          <ul className="flex flex-col gap-1.5">
            {brands.map((brand) => (
              <li key={brand.id}>
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer hover:bg-muted transition-colors">
                  <input
                    type="checkbox"
                    checked={activeBrandIds.includes(brand.id)}
                    onChange={() => onBrandToggle(brand.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  {brand.name}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Faixa de Preço
        </h3>
        <div className="flex items-center gap-2 px-1">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Mín"
            value={priceMin}
            onChange={(e) => onPriceMinChange(e.target.value)}
            className="input text-center"
          />
          <span className="text-muted-foreground shrink-0">&ndash;</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Máx"
            value={priceMax}
            onChange={(e) => onPriceMaxChange(e.target.value)}
            className="input text-center"
          />
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="btn btn-outline w-full gap-2"
        >
          <X size={16} />
          Limpar Filtros
        </button>
      )}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build a window of page numbers around current page
  const pages: (number | 'ellipsis')[] = [];
  const delta = 2;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - delta && i <= page + delta)
    ) {
      pages.push(i);
    } else if (
      pages.length > 0 &&
      pages[pages.length - 1] !== 'ellipsis'
    ) {
      pages.push('ellipsis');
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="btn btn-ghost btn-icon"
        aria-label="Página anterior"
      >
        <ChevronLeft size={18} />
      </button>

      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-2 text-muted-foreground select-none"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`btn btn-sm min-w-[2.25rem] ${
              p === page ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="btn btn-ghost btn-icon"
        aria-label="Próxima página"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Products Page
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ---- Read filter state from URL ----
  const searchQuery = searchParams.get('search') || '';
  const sortValue = searchParams.get('sort') || 'newest';
  const page = Number(searchParams.get('page')) || 1;
  const activeCategoryId = searchParams.get('category_id')
    ? Number(searchParams.get('category_id'))
    : null;
  const activeBrandIds = useMemo(() => {
    const raw = searchParams.get('brand_ids');
    if (!raw) return [] as number[];
    return raw
      .split(',')
      .map(Number)
      .filter((n) => !Number.isNaN(n));
  }, [searchParams]);
  const priceMin = searchParams.get('price_min') || '';
  const priceMax = searchParams.get('price_max') || '';

  // ---- Helper to update URL params ----
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value === null || value === '') {
            next.delete(key);
          } else {
            next.set(key, value);
          }
        }
        return next;
      });
    },
    [setSearchParams],
  );

  // ---- Filter change handlers ----
  const handleCategorySelect = (id: number | null) => {
    updateParams({ category_id: id !== null ? String(id) : null, page: null });
  };

  const handleBrandToggle = (id: number) => {
    const next = activeBrandIds.includes(id)
      ? activeBrandIds.filter((b) => b !== id)
      : [...activeBrandIds, id];
    updateParams({
      brand_ids: next.length > 0 ? next.join(',') : null,
      page: null,
    });
  };

  const handlePriceMinChange = (value: string) => {
    updateParams({ price_min: value || null, page: null });
  };

  const handlePriceMaxChange = (value: string) => {
    updateParams({ price_max: value || null, page: null });
  };

  const handleClearFilters = () => {
    setSearchParams({});
  };

  const handleSearchChange = (value: string) => {
    updateParams({ search: value || null, page: null });
  };

  const handleSortChange = (value: string) => {
    updateParams({ sort: value === 'newest' ? null : value, page: null });
  };

  const handlePageChange = (p: number) => {
    updateParams({ page: p > 1 ? String(p) : null });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---- Build API params ----
  const apiParams: Record<string, unknown> = {
    page,
    per_page: PER_PAGE,
  };
  if (searchQuery) apiParams.search = searchQuery;
  if (activeCategoryId !== null) apiParams.category_id = activeCategoryId;
  if (activeBrandIds.length > 0) apiParams.brand_ids = activeBrandIds.join(',');
  if (priceMin) apiParams.price_min = priceMin;
  if (priceMax) apiParams.price_max = priceMax;

  switch (sortValue) {
    case 'price_asc':
      apiParams.sort = 'price';
      apiParams.order = 'asc';
      break;
    case 'price_desc':
      apiParams.sort = 'price';
      apiParams.order = 'desc';
      break;
    case 'name_asc':
      apiParams.sort = 'name';
      apiParams.order = 'asc';
      break;
    default:
      apiParams.sort = 'created_at';
      apiParams.order = 'desc';
  }

  // ---- Data fetching ----
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => storeApi.getCategories(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: brands = [] } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => storeApi.getBrands(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', apiParams],
    queryFn: () => storeApi.getProducts(apiParams),
  });

  const products = productsData?.data ?? [];
  const totalPages = productsData?.total_pages ?? 1;

  // ---- Count active filters for mobile badge ----
  const filterCount =
    (activeCategoryId !== null ? 1 : 0) +
    activeBrandIds.length +
    (priceMin ? 1 : 0) +
    (priceMax ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      {/* ---- Top bar ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Mobile filter toggle */}
        <button
          onClick={() => setMobileFiltersOpen(true)}
          className="btn btn-outline gap-2 lg:hidden"
        >
          <SlidersHorizontal size={16} />
          Filtros
          {filterCount > 0 && (
            <span className="badge bg-primary text-white ml-1">
              {filterCount}
            </span>
          )}
        </button>

        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input pl-9"
          />
        </div>

        {/* Sort */}
        <Select
          value={sortValue}
          onChange={handleSortChange}
          options={SORT_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
          className="w-auto min-w-[180px]"
        />
      </div>

      <div className="flex gap-8">
        {/* ---- Desktop Sidebar ---- */}
        <div className="hidden lg:block w-60 shrink-0">
          <Sidebar
            categories={categories}
            brands={brands}
            activeCategoryId={activeCategoryId}
            activeBrandIds={activeBrandIds}
            priceMin={priceMin}
            priceMax={priceMax}
            onCategorySelect={handleCategorySelect}
            onBrandToggle={handleBrandToggle}
            onPriceMinChange={handlePriceMinChange}
            onPriceMaxChange={handlePriceMaxChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* ---- Mobile Sidebar Overlay ---- */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileFiltersOpen(false)}
            />
            {/* Panel */}
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-card p-5 overflow-y-auto shadow-xl">
              <Sidebar
                categories={categories}
                brands={brands}
                activeCategoryId={activeCategoryId}
                activeBrandIds={activeBrandIds}
                priceMin={priceMin}
                priceMax={priceMax}
                onCategorySelect={(id) => {
                  handleCategorySelect(id);
                  setMobileFiltersOpen(false);
                }}
                onBrandToggle={handleBrandToggle}
                onPriceMinChange={handlePriceMinChange}
                onPriceMaxChange={handlePriceMaxChange}
                onClearFilters={() => {
                  handleClearFilters();
                  setMobileFiltersOpen(false);
                }}
                onClose={() => setMobileFiltersOpen(false)}
              />
            </div>
          </div>
        )}

        {/* ---- Products Grid ---- */}
        <div className="flex-1 min-w-0">
          {productsLoading ? (
            <ProductGridSkeleton />
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={48} className="text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground text-sm">
                Tente ajustar seus filtros ou termos de busca.
              </p>
              {filterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="btn btn-outline mt-4"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
