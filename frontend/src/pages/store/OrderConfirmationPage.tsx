import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowLeft, MapPin, CreditCard, MessageCircle } from 'lucide-react';
import type { Order } from '@/types';
import { useStore } from '@/contexts/StoreContext';
import { formatCurrency } from '@/lib/formatters';
import { PAYMENT_LABELS } from '@/lib/order-constants';

function buildWhatsAppUrl(phone: string, order: Order): string {
  const items = (order.items ?? [])
    .map((item) => `  - ${item.product_name} (x${item.quantity}) ${formatCurrency(item.total)}`)
    .join('\n');

  const text = [
    `Olá! Acabei de fazer um pedido na loja.`,
    ``,
    `*Pedido:* ${order.order_number}`,
    `*Nome:* ${order.customer_name}`,
    items ? `\n*Itens:*\n${items}` : '',
    `\n*Total:* ${formatCurrency(order.total)}`,
    order.delivery_method === 'pickup' ? `*Entrega:* Retirada na loja` : `*Entrega:* ${order.shipping_address}, ${order.shipping_neighborhood ? order.shipping_neighborhood + ', ' : ''}${order.shipping_city} - ${order.shipping_state}`,
  ]
    .filter(Boolean)
    .join('\n');

  const cleaned = phone.replace(/\D/g, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

export function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { store } = useStore();
  const order = (location.state as { order?: Order } | null)?.order;
  const orderNumber = order?.order_number ?? searchParams.get('order');

  // No order state (e.g. page refresh) — show simplified confirmation
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        {orderNumber ? (
          <>
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-success/10 mb-5">
              <CheckCircle size={44} className="text-success" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">Pedido Realizado!</h1>
            <p className="text-muted-foreground mb-1">O número do seu pedido é:</p>
            <p className="my-3 text-2xl font-bold text-primary tracking-wide">{orderNumber}</p>
            <p className="text-sm text-muted-foreground mb-8">
              Acompanhe o status do pedido na página de rastreio.
            </p>
            <Link to="/" className="btn btn-primary btn-lg gap-2">
              <ArrowLeft size={16} /> Continuar Comprando
            </Link>
          </>
        ) : (
          <>
            <h1 className="mb-4 text-2xl font-bold">Pedido não encontrado</h1>
            <Link to="/" className="btn btn-primary">Voltar ao Início</Link>
          </>
        )}
      </div>
    );
  }

  const whatsappUrl = store?.whatsapp_number ? buildWhatsAppUrl(store.whatsapp_number, order) : null;

  return (
    <div className="mx-auto max-w-2xl py-12">
      {/* Success header */}
      <div className="text-center mb-10 animate-scale-in">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-success/10 mb-5">
          <CheckCircle size={44} className="text-success" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Pedido Realizado com Sucesso!</h1>
        <p className="text-muted-foreground">
          Obrigado pela sua compra. O número do seu pedido é:
        </p>
        <p className="my-3 text-2xl font-bold text-primary tracking-wide">{order.order_number}</p>
        <p className="text-sm text-muted-foreground">
          Confirmação enviada para <strong className="text-foreground">{order.customer_email}</strong>
        </p>
      </div>

      {/* WhatsApp confirmation */}
      {whatsappUrl && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5 text-center">
          <p className="text-sm text-green-800 mb-3">
            Envie a confirmação do pedido por WhatsApp para a loja:
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-lg gap-2 font-semibold inline-flex items-center"
            style={{ backgroundColor: '#25D366', color: '#fff', borderRadius: 12, padding: '12px 24px' }}
          >
            <MessageCircle size={20} />
            Enviar pelo WhatsApp
          </a>
        </div>
      )}

      {/* Order items */}
      <div className="rounded-xl border bg-card">
        <div className="p-5 border-b bg-muted/30 flex items-center gap-2">
          <Package size={18} className="text-primary" />
          <h2 className="text-base font-bold">Itens do Pedido</h2>
        </div>

        <div className="divide-y">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              {item.product_image ? (
                <img src={item.product_image} alt={item.product_name} className="h-14 w-14 rounded-lg object-cover ring-1 ring-border" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">N/A</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{item.product_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Qtd: {item.quantity} x {formatCurrency(item.price)}</p>
              </div>
              <span className="text-sm font-bold">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>

        <div className="p-5 bg-muted/30 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frete</span>
            <span>{(order.shipping_cost ?? 0) > 0 ? `${formatCurrency(order.shipping_cost)}` : 'Grátis'}</span>
          </div>
          {(order.discount ?? 0) > 0 && (
            <div className="flex justify-between text-success">
              <span>Desconto</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-3 text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Delivery info */}
      <div className="mt-5 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-primary" />
          <h3 className="text-sm font-bold">Método de Entrega</h3>
        </div>
        <p className="text-sm font-medium">
          {order.delivery_method === 'pickup' ? 'Retirada na Loja' : 'Entrega'}
        </p>
        {order.delivery_method === 'delivery' && (
          <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
            <p>{order.customer_name}</p>
            <p>{order.shipping_address}</p>
            {order.shipping_neighborhood && <p>{order.shipping_neighborhood}</p>}
            <p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p>
          </div>
        )}
      </div>

      {/* Payment info */}
      {order.payment_method !== 'pay_on_pickup' && (
        <div className="mt-4 rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={16} className="text-primary" />
            <h3 className="text-sm font-bold">Forma de Pagamento</h3>
          </div>
          <p className="text-sm font-medium">
            {PAYMENT_LABELS[order.payment_method] || order.payment_method}
          </p>
          {order.payment_method === 'cash' && order.change_for != null && (
            <p className="mt-1 text-sm text-muted-foreground">
              Troco para {formatCurrency(order.change_for)}
            </p>
          )}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link to="/" className="btn btn-primary btn-lg gap-2">
          <ArrowLeft size={16} /> Continuar Comprando
        </Link>
      </div>
    </div>
  );
}
