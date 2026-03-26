import { useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { adminOrderApi } from '@/lib/api';
import type { Order, PaginatedResponse } from '@/types';
import { Select } from '@/components/ui/Select';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PER_PAGE = 15;

const ORDER_STATUSES = [
  { label: 'Todos os Status', value: '' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Processando', value: 'processing' },
  { label: 'Enviado', value: 'shipped' },
  { label: 'Pronto para Retirada', value: 'ready_for_pickup' },
  { label: 'Entregue', value: 'delivered' },
  { label: 'Cancelado', value: 'cancelled' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  ready_for_pickup: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  processing: 'Processando',
  shipped: 'Enviado',
  ready_for_pickup: 'Pronto para Retirada',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function OrdersTableSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pedido #</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-mail</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b last:border-b-0">
                <td className="px-4 py-3"><div className="h-4 w-20 skeleton" /></td>
                <td className="px-4 py-3"><div className="h-4 w-28 skeleton" /></td>
                <td className="px-4 py-3"><div className="h-4 w-36 skeleton" /></td>
                <td className="px-4 py-3"><div className="h-4 w-16 skeleton ml-auto" /></td>
                <td className="px-4 py-3"><div className="h-6 w-20 skeleton rounded-full" /></td>
                <td className="px-4 py-3"><div className="h-4 w-24 skeleton" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

  const pages: (number | 'ellipsis')[] = [];
  const delta = 2;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= page - delta && i <= page + delta)
    ) {
      pages.push(i);
    } else if (pages.length > 0 && pages[pages.length - 1] !== 'ellipsis') {
      pages.push('ellipsis');
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-6">
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
// Orders Page
// ---------------------------------------------------------------------------

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- Read state from URL ----
  const searchQuery = searchParams.get('search') || '';
  const statusFilter = searchParams.get('status') || '';
  const page = Number(searchParams.get('page')) || 1;

  // Local search input state (only applies on submit)
  const [searchInput, setSearchInput] = useState(searchQuery);

  // ---- URL param updater ----
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput || null, page: null });
  };

  const handleStatusChange = (value: string) => {
    updateParams({ status: value || null, page: null });
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
  if (statusFilter) apiParams.status = statusFilter;

  // ---- Data fetching ----
  const { data, isLoading } = useQuery<PaginatedResponse<Order>>({
    queryKey: ['admin', 'orders', apiParams],
    queryFn: () => adminOrderApi.list(apiParams),
  });

  const orders = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Pedidos</h1>

      {/* ---- Top Bar ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar pedidos..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input pl-9"
            />
          </div>
          <button type="submit" className="btn btn-primary shrink-0">
            Buscar
          </button>
        </form>

        {/* Status Filter */}
        <Select
          value={statusFilter}
          onChange={handleStatusChange}
          options={ORDER_STATUSES.map(opt => ({ value: opt.value, label: opt.label }))}
          className="w-auto min-w-[180px]"
        />
      </div>

      {/* ---- Table ---- */}
      {isLoading ? (
        <OrdersTableSkeleton />
      ) : orders.length > 0 ? (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pedido #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-mail</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 truncate max-w-[160px]">
                        {order.customer_name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                        {order.customer_email}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge text-xs px-2 py-0.5 rounded-full ${
                            STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCartEmpty />
          <h3 className="text-lg font-medium mb-1 mt-4">Nenhum pedido encontrado</h3>
          <p className="text-muted-foreground text-sm">
            {searchQuery || statusFilter
              ? 'Tente ajustar sua busca ou filtros.'
              : 'Os pedidos aparecerão aqui quando os clientes realizarem compras.'}
          </p>
        </div>
      )}
    </div>
  );
}

// Small inline icon for empty state so we don't need an extra import
function ShoppingCartEmpty() {
  return (
    <Search size={48} className="text-muted-foreground" />
  );
}
