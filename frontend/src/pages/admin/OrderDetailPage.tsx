import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';
import { adminOrderApi } from '@/lib/api';
import type { Order } from '@/types';
import { Select } from '@/components/ui/Select';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_STATUSES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

type OrderStatus = (typeof ALL_STATUSES)[number];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={18} />,
  confirmed: <ClipboardCheck size={18} />,
  processing: <Package size={18} />,
  shipped: <Truck size={18} />,
  delivered: <CheckCircle2 size={18} />,
  cancelled: <XCircle size={18} />,
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  processing: 'Processando',
  shipped: 'Enviado',
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function OrderDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Status timeline skeleton */}
      <div className="card p-6">
        <div className="h-5 w-32 skeleton mb-4" />
        <div className="flex items-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className="h-10 w-10 rounded-full skeleton" />
              {i < 5 && <div className="h-1 flex-1 skeleton" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer info skeleton */}
        <div className="card p-6">
          <div className="h-5 w-40 skeleton mb-4" />
          <div className="flex flex-col gap-3">
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-3/4 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
          </div>
        </div>

        {/* Shipping address skeleton */}
        <div className="card p-6">
          <div className="h-5 w-40 skeleton mb-4" />
          <div className="flex flex-col gap-3">
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-3/4 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
          </div>
        </div>

        {/* Status update skeleton */}
        <div className="card p-6">
          <div className="h-5 w-32 skeleton mb-4" />
          <div className="h-10 w-full skeleton mb-3" />
          <div className="h-10 w-full skeleton" />
        </div>
      </div>

      {/* Items table skeleton */}
      <div className="card p-6">
        <div className="h-5 w-28 skeleton mb-4" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b last:border-b-0">
            <div className="h-12 w-12 skeleton rounded" />
            <div className="flex-1">
              <div className="h-4 w-48 skeleton mb-1" />
              <div className="h-3 w-24 skeleton" />
            </div>
            <div className="h-4 w-16 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status Timeline
// ---------------------------------------------------------------------------

function StatusTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  // For cancelled orders, highlight only pending and cancelled
  const isCancelled = currentStatus === 'cancelled';
  const normalFlow: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
  const statuses = isCancelled
    ? (['pending', 'cancelled'] as OrderStatus[])
    : normalFlow;

  const currentIndex = statuses.indexOf(currentStatus);

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-6">Status do Pedido</h2>
      <div className="flex items-center">
        {statuses.map((status, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div key={status} className="flex items-center flex-1 last:flex-initial">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex items-center justify-center h-10 w-10 rounded-full border-2 transition-colors ${
                    isCurrent
                      ? `${STATUS_COLORS[status]} border-current`
                      : isActive
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {STATUS_ICON[status]}
                </div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isCurrent
                      ? 'text-foreground'
                      : isActive
                        ? 'text-green-700'
                        : 'text-muted-foreground'
                  }`}
                >
                  {STATUS_LABELS[status] || status}
                </span>
              </div>

              {/* Connector line */}
              {index < statuses.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 mt-[-1.25rem] ${
                    index < currentIndex ? 'bg-green-400' : 'bg-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order Detail Page
// ---------------------------------------------------------------------------

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = Number(id);
  const queryClient = useQueryClient();

  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // ---- Fetch order ----
  const { data: order, isLoading } = useQuery<Order>({
    queryKey: ['admin', 'order', orderId],
    queryFn: () => adminOrderApi.get(orderId),
    enabled: !Number.isNaN(orderId),
  });

  // ---- Status mutation ----
  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => adminOrderApi.updateStatus(orderId, newStatus),
    onSuccess: (updatedOrder) => {
      queryClient.setQueryData(['admin', 'order', orderId], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      setSelectedStatus('');
      toast.success(`Status do pedido atualizado para "${updatedOrder.status}".`);
    },
    onError: () => {
      toast.error('Falha ao atualizar status do pedido. Tente novamente.');
    },
  });

  const handleStatusUpdate = () => {
    if (!selectedStatus) return;
    statusMutation.mutate(selectedStatus);
  };

  // ---- Loading ----
  if (isLoading || !order) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin/orders" className="btn btn-ghost btn-icon">
            <ArrowLeft size={20} />
          </Link>
          <div className="h-7 w-48 skeleton" />
        </div>
        <OrderDetailSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <Link to="/admin/orders" className="btn btn-ghost btn-icon shrink-0">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">
            Pedido {order.order_number}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Realizado em {formatDate(order.created_at)}
          </p>
        </div>
        <span
          className={`badge text-sm px-3 py-1 rounded-full self-start ${
            STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {STATUS_LABELS[order.status] || order.status}
        </span>
      </div>

      <div className="flex flex-col gap-6">
        {/* ---- Status Timeline ---- */}
        <StatusTimeline currentStatus={order.status} />

        {/* ---- Info Cards ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Informações do Cliente
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{order.customer_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd className="font-medium">{order.customer_email}</dd>
              </div>
              {order.customer_phone && (
                <div>
                  <dt className="text-muted-foreground">Telefone</dt>
                  <dd className="font-medium">{order.customer_phone}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Delivery & Shipping */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Entrega & Pagamento
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Método de Entrega</dt>
                <dd className="font-medium">
                  {order.delivery_method === 'pickup' ? 'Retirada na Loja' : 'Entrega'}
                </dd>
              </div>
              {order.delivery_method === 'delivery' && (
                <div>
                  <dt className="text-muted-foreground">Endereço</dt>
                  <dd className="font-medium">
                    {order.shipping_address}<br />
                    {order.shipping_city}, {order.shipping_state} {order.shipping_zip}
                  </dd>
                </div>
              )}
              {order.payment_method !== 'pay_on_pickup' && (
                <div>
                  <dt className="text-muted-foreground">Forma de Pagamento</dt>
                  <dd className="font-medium">
                    {{ credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito', cash: 'Dinheiro', pix: 'PIX' }[order.payment_method] || order.payment_method}
                  </dd>
                </div>
              )}
              {order.payment_method === 'cash' && order.change_for != null && (
                <div>
                  <dt className="text-muted-foreground">Troco para</dt>
                  <dd className="font-medium">{formatCurrency(order.change_for)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Status Update */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Atualizar Status
            </h2>
            <div className="flex flex-col gap-3">
              <Select
                value={selectedStatus}
                onChange={setSelectedStatus}
                disabled={statusMutation.isPending}
                placeholder="Selecione o novo status..."
                options={ALL_STATUSES.filter((s) => s !== order.status).map((s) => ({
                  value: s,
                  label: STATUS_LABELS[s] || s,
                }))}
              />
              <button
                onClick={handleStatusUpdate}
                disabled={!selectedStatus || statusMutation.isPending}
                className="btn btn-primary gap-2"
              >
                {statusMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Atualizar Status
              </button>
            </div>
          </div>
        </div>

        {/* ---- Order Items ---- */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Itens do Pedido</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Produto</th>
                  <th className="pb-3 pr-4 font-medium text-right">Preço</th>
                  <th className="pb-3 pr-4 font-medium text-right">Qtd</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {item.product_image && (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <span className="font-medium">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="py-3 pr-4 text-right">{item.quantity}</td>
                    <td className="py-3 text-right font-medium whitespace-nowrap">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---- Financial Summary ---- */}
          <div className="border-t mt-4 pt-4">
            <div className="flex flex-col items-end gap-1.5 text-sm">
              <div className="flex items-center justify-between w-full max-w-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between w-full max-w-xs">
                <span className="text-muted-foreground">Frete</span>
                <span>{formatCurrency(order.shipping_cost)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex items-center justify-between w-full max-w-xs">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="text-red-600">-{formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between w-full max-w-xs border-t pt-2 mt-1">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Notes ---- */}
        {order.notes && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Observações do Pedido
            </h2>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
