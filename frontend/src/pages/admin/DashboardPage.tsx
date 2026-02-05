import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { adminApi } from '@/lib/api';
import type { DashboardMetrics } from '@/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
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

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 skeleton" />
              <div className="h-10 w-10 rounded-lg skeleton" />
            </div>
            <div className="h-8 w-32 skeleton" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="card p-6">
        <div className="h-5 w-48 skeleton mb-6" />
        <div className="h-72 skeleton" />
      </div>

      {/* Tables skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="h-5 w-32 skeleton mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="h-4 w-6 skeleton" />
              <div className="h-4 flex-1 skeleton" />
              <div className="h-4 w-12 skeleton" />
              <div className="h-4 w-20 skeleton" />
            </div>
          ))}
        </div>
        <div className="card p-6">
          <div className="h-5 w-32 skeleton mb-4" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="h-4 w-16 skeleton" />
              <div className="h-4 flex-1 skeleton" />
              <div className="h-4 w-16 skeleton" />
              <div className="h-6 w-20 skeleton rounded-full" />
              <div className="h-4 w-20 skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accentClass: string;
}

function MetricCard({ label, value, icon, accentClass }: MetricCardProps) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <div className={`flex items-center justify-center h-10 w-10 rounded-lg ${accentClass}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard(),
  });

  if (isLoading || !data) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold mb-6">Painel</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <h1 className="text-2xl font-bold mb-6">Painel</h1>

      <div className="flex flex-col gap-8">
        {/* ---- Metric Cards ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Total de Pedidos"
            value={data.total_orders.toLocaleString()}
            icon={<ShoppingCart size={20} className="text-blue-600" />}
            accentClass="bg-blue-100"
          />
          <MetricCard
            label="Receita Total"
            value={formatCurrency(data.total_revenue)}
            icon={<DollarSign size={20} className="text-green-600" />}
            accentClass="bg-green-100"
          />
          <MetricCard
            label="Total de Produtos"
            value={data.total_products.toLocaleString()}
            icon={<Package size={20} className="text-purple-600" />}
            accentClass="bg-purple-100"
          />
          <MetricCard
            label="Total de Clientes"
            value={data.total_customers.toLocaleString()}
            icon={<Users size={20} className="text-orange-600" />}
            accentClass="bg-orange-100"
          />
        </div>

        {/* ---- Revenue Chart ---- */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-6">Receita (Últimos 30 Dias)</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chart_data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: string) => {
                    const d = new Date(value);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value: number) => `R$${value}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  labelFormatter={(label: string) => formatDate(label)}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ---- Bottom Tables ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Produtos Mais Vendidos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">#</th>
                    <th className="pb-3 pr-4 font-medium">Produto</th>
                    <th className="pb-3 pr-4 font-medium text-right">Vendidos</th>
                    <th className="pb-3 font-medium text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_products.map((product, index) => (
                    <tr key={product.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-8 w-8 rounded object-cover"
                            />
                          )}
                          <span className="font-medium truncate max-w-[200px]">
                            {product.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right">{product.sold}</td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(product.revenue)}
                      </td>
                    </tr>
                  ))}
                  {data.top_products.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground">
                        Nenhum dado de produto ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Pedidos Recentes</h2>
              <Link to="/admin/orders" className="btn btn-ghost btn-sm">
                Ver todos
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Pedido #</th>
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 font-medium text-right">Total</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <Link
                          to={`/admin/orders/${order.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 truncate max-w-[120px]">
                        {order.customer}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`badge text-xs px-2 py-0.5 rounded-full capitalize ${
                            STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))}
                  {data.recent_orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum pedido ainda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
