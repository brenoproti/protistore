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
  PackageCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { storeApi } from '@/lib/api';
import { formatDate } from '@/lib/formatters';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/order-constants';

interface TrackingOrder {
  order_number: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'ready_for_pickup' | 'delivered' | 'cancelled';
  delivery_method: 'pickup' | 'delivery';
  created_at: string;
  updated_at: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={18} />,
  confirmed: <ClipboardCheck size={18} />,
  processing: <Package size={18} />,
  shipped: <Truck size={18} />,
  ready_for_pickup: <PackageCheck size={18} />,
  delivered: <CheckCircle2 size={18} />,
  cancelled: <XCircle size={18} />,
};

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'ready_for_pickup' | 'delivered' | 'cancelled';

function StatusTimeline({ currentStatus, deliveryMethod }: { currentStatus: OrderStatus; deliveryMethod: string }) {
  const isCancelled = currentStatus === 'cancelled';
  const isPickup = deliveryMethod === 'pickup';
  const normalFlow: OrderStatus[] = isPickup
    ? ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'delivered']
    : ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
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

export function OrderTrackingPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [searchedNumber, setSearchedNumber] = useState('');

  const { data: order, isLoading, isError } = useQuery<TrackingOrder>({
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
            placeholder="Ex: PS-20240101-ABC123"
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
            <StatusTimeline currentStatus={order.status} deliveryMethod={order.delivery_method} />
            <div className="mt-5 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>Realizado em {formatDate(order.created_at)}</span>
              <span>·</span>
              <span>{order.delivery_method === 'pickup' ? 'Retirada na loja' : 'Entrega'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
