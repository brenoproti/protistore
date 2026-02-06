import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Package, ArrowLeft } from 'lucide-react';
import { storeApi } from '@/lib/api';

export function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: () => storeApi.getOrderByNumber(orderNumber!),
    enabled: !!orderNumber,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="skeleton mx-auto mb-4 h-16 w-16 rounded-full" />
        <div className="skeleton mx-auto mb-2 h-8 w-64" />
        <div className="skeleton mx-auto h-4 w-48" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-4 text-2xl font-bold">Pedido não encontrado</h1>
        <Link to="/" className="btn btn-primary">Voltar ao Início</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="text-center">
        <CheckCircle size={64} className="mx-auto mb-4 text-success" />
        <h1 className="mb-2 text-2xl font-bold">Pedido Realizado com Sucesso!</h1>
        <p className="text-muted-foreground">
          Obrigado pela sua compra. O número do seu pedido é:
        </p>
        <p className="my-3 text-xl font-bold text-primary">{order.order_number}</p>
        <p className="text-sm text-muted-foreground">
          Enviamos uma confirmação para <strong>{order.customer_email}</strong>
        </p>
      </div>

      <div className="mt-8 rounded-lg border p-6">
        <div className="mb-4 flex items-center gap-2">
          <Package size={20} className="text-primary" />
          <h2 className="text-lg font-semibold">Detalhes do Pedido</h2>
        </div>

        <div className="space-y-3">
          {order.items?.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              {item.product_image ? (
                <img src={item.product_image} alt={item.product_name} className="h-12 w-12 rounded object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-xs text-muted-foreground">N/A</div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{item.product_name}</p>
                <p className="text-xs text-muted-foreground">Qtd: {item.quantity} x R$ {item.price.toFixed(2)}</p>
              </div>
              <span className="text-sm font-medium">R$ {item.total.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>R$ {order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Frete</span>
            <span>{order.shipping_cost > 0 ? `R$ ${order.shipping_cost.toFixed(2)}` : 'Grátis'}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Desconto</span>
              <span>-R$ {order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">R$ {order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-lg border p-6">
        <h3 className="mb-3 text-sm font-semibold">Método de Entrega</h3>
        <p className="text-sm font-medium">
          {order.delivery_method === 'pickup' ? 'Retirada na Loja' : 'Entrega'}
        </p>
        {order.delivery_method === 'delivery' && (
          <div className="mt-2">
            <p className="text-sm">{order.customer_name}</p>
            <p className="text-sm text-muted-foreground">
              {order.shipping_address}<br />
              {order.shipping_city}, {order.shipping_state} {order.shipping_zip}
            </p>
          </div>
        )}
      </div>

      {order.payment_method !== 'pay_on_pickup' && (
        <div className="mt-4 rounded-lg border p-6">
          <h3 className="mb-3 text-sm font-semibold">Forma de Pagamento</h3>
          <p className="text-sm font-medium">
            {{ credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito', cash: 'Dinheiro', pix: 'PIX' }[order.payment_method] || order.payment_method}
          </p>
          {order.payment_method === 'cash' && order.change_for != null && (
            <p className="mt-1 text-sm text-muted-foreground">
              Troco para R$ {order.change_for.toFixed(2)}
            </p>
          )}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/" className="btn btn-primary btn-lg gap-2">
          <ArrowLeft size={16} /> Continuar Comprando
        </Link>
      </div>
    </div>
  );
}
