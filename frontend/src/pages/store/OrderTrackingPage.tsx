import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Clock,
  ClipboardCheck,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { storeApi } from '@/lib/api';
import type { Order } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  processing: 'Processando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

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

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

function StatusTimeline({ currentStatus }: { currentStatus: OrderStatus }) {
  const isCancelled = currentStatus === 'cancelled';
  const normalFlow: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
  const statuses = isCancelled ? (['pending', 'cancelled'] as OrderStatus[]) : normalFlow;
  const currentIndex = statuses.indexOf(currentStatus);

  return (
    <div className="flex items-center">
      {statuses.map((status, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <div key={status} className="flex items-center flex-1 last:flex-initial">
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
                {STATUS_LABELS[status]}
              </span>
            </div>
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
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [searchedNumber, setSearchedNumber] = useState('');

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ['track-order', searchedNumber],
    queryFn: () => storeApi.getOrderByNumber(searchedNumber),
    enabled: !!searchedNumber,
    retry: false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = orderNumber.trim();
    if (trimmed) setSearchedNumber(trimmed);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-2">
        <Link to="/" className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft size={16} /> Voltar
        </Link>
      </div>

      <div className="text-center mb-8">
        <Package size={40} className="mx-auto mb-3 text-primary" />
        <h1 className="text-2xl font-bold mb-1">Rastrear Pedido</h1>
        <p className="text-muted-foreground text-sm">
          Digite o número do pedido para acompanhar o status.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
            placeholder="Ex: VS-20240101-ABC123"
            className="input pl-9"
            autoFocus
          />
        </div>
        <button type="submit" disabled={!orderNumber.trim()} className="btn btn-primary gap-2">
          <Search size={16} /> Buscar
        </button>
      </form>

      {isLoading && (
        <div className="space-y-4">
          <div className="skeleton h-24 rounded-lg" />
          <div className="skeleton h-40 rounded-lg" />
        </div>
      )}

      {isError && searchedNumber && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <XCircle size={32} className="mx-auto mb-3 text-destructive" />
          <h3 className="font-semibold mb-1">Pedido não encontrado</h3>
          <p className="text-sm text-muted-foreground">
            Verifique o número do pedido e tente novamente.
          </p>
        </div>
      )}

      {order && (
        <div className="space-y-6 animate-in">
          {/* Status card */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Pedido</p>
                <p className="text-lg font-bold text-primary">{order.order_number}</p>
              </div>
              <span className={`badge text-sm px-3 py-1 ${STATUS_COLORS[order.status]}`}>
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>
            <StatusTimeline currentStatus={order.status} />
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Realizado em {formatDate(order.created_at)}
            </p>
          </div>

          {/* Items */}
          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-4">Itens do Pedido</h2>
            <div className="space-y-3">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name} className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">N/A</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">Qtd: {item.quantity} x {formatCurrency(item.price)}</p>
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-3 flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Delivery info */}
          <div className="rounded-lg border p-6">
            <h2 className="font-semibold mb-3">Método de Entrega</h2>
            <p className="text-sm font-medium">
              {order.delivery_method === 'pickup' ? 'Retirada na Loja' : 'Entrega'}
            </p>
            {order.delivery_method === 'delivery' && (
              <div className="mt-2">
                <p className="text-sm font-medium">{order.customer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {order.shipping_address}<br />
                  {order.shipping_city}, {order.shipping_state} {order.shipping_zip}
                </p>
              </div>
            )}
          </div>

          {/* Payment info */}
          {order.payment_method !== 'pay_on_pickup' && (
            <div className="rounded-lg border p-6">
              <h2 className="font-semibold mb-3">Forma de Pagamento</h2>
              <p className="text-sm font-medium">
                {{ credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito', cash: 'Dinheiro', pix: 'PIX' }[order.payment_method] || order.payment_method}
              </p>
              {order.payment_method === 'cash' && order.change_for != null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Troco para {formatCurrency(order.change_for)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
