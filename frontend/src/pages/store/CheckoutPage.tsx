import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2, Store, Truck, CreditCard, Banknote, QrCode } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { storeApi } from '@/lib/api';
import { toast } from 'sonner';

const checkoutSchema = z.object({
  customer_name: z.string().min(2, 'Nome é obrigatório'),
  customer_email: z.string().email('E-mail válido é obrigatório'),
  customer_phone: z.string().optional(),
  delivery_method: z.enum(['pickup', 'delivery']),
  shipping_address: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_state: z.string().optional(),
  shipping_zip: z.string().optional(),
  payment_method: z.enum(['credit_card', 'debit_card', 'cash', 'pix']).optional(),
  change_for: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.delivery_method === 'delivery') {
    if (!data.shipping_address || data.shipping_address.length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Endereço é obrigatório', path: ['shipping_address'] });
    }
    if (!data.shipping_city || data.shipping_city.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cidade é obrigatória', path: ['shipping_city'] });
    }
    if (!data.shipping_state || data.shipping_state.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Estado é obrigatório', path: ['shipping_state'] });
    }
    if (!data.shipping_zip || data.shipping_zip.length < 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'CEP é obrigatório', path: ['shipping_zip'] });
    }
    if (!data.payment_method) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Forma de pagamento é obrigatória', path: ['payment_method'] });
    }
  }
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

const PAYMENT_OPTIONS = [
  { value: 'credit_card' as const, label: 'Cartão de Crédito', icon: CreditCard },
  { value: 'debit_card' as const, label: 'Cartão de Débito', icon: CreditCard },
  { value: 'cash' as const, label: 'Dinheiro', icon: Banknote },
  { value: 'pix' as const, label: 'PIX', icon: QrCode },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, control } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      delivery_method: 'delivery',
      payment_method: 'pix',
    },
  });

  const deliveryMethod = useWatch({ control, name: 'delivery_method' });
  const paymentMethod = useWatch({ control, name: 'payment_method' });

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="mb-6 text-muted-foreground">Adicione alguns produtos antes de finalizar a compra.</p>
        <Link to="/products" className="btn btn-primary">Ver Produtos</Link>
      </div>
    );
  }

  const onSubmit = async (data: CheckoutForm) => {
    setSubmitting(true);
    try {
      const changeForNum = data.payment_method === 'cash' && data.change_for
        ? parseFloat(data.change_for)
        : undefined;

      if (changeForNum !== undefined && changeForNum < totalPrice) {
        toast.error('O valor do troco deve ser maior ou igual ao total do pedido.');
        setSubmitting(false);
        return;
      }

      const isPickup = data.delivery_method === 'pickup';
      const order = await storeApi.checkout({
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || undefined,
        delivery_method: data.delivery_method,
        shipping_address: isPickup ? '' : data.shipping_address,
        shipping_city: isPickup ? '' : data.shipping_city,
        shipping_state: isPickup ? '' : data.shipping_state,
        shipping_zip: isPickup ? '' : data.shipping_zip,
        payment_method: isPickup ? 'pay_on_pickup' : data.payment_method!,
        change_for: changeForNum,
        notes: data.notes || undefined,
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
      });
      clearCart();
      toast.success('Pedido realizado com sucesso!');
      navigate(`/order-confirmation?order=${order.order_number}`);
    } catch {
      toast.error('Falha ao realizar o pedido. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <Link to="/cart" className="btn btn-ghost btn-sm gap-1 mb-4">
          <ArrowLeft size={16} /> Voltar ao Carrinho
        </Link>
        <h1 className="text-2xl font-bold">Finalizar Compra</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Contact Info */}
            <div className="rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Informações de Contato</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Nome Completo *</label>
                  <input {...register('customer_name')} className="input" placeholder="João da Silva" />
                  {errors.customer_name && <p className="mt-1 text-xs text-destructive">{errors.customer_name.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">E-mail *</label>
                  <input {...register('customer_email')} type="email" className="input" placeholder="joao@exemplo.com" />
                  {errors.customer_email && <p className="mt-1 text-xs text-destructive">{errors.customer_email.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Telefone</label>
                  <input {...register('customer_phone')} className="input" placeholder="(11) 99999-9999" />
                </div>
              </div>
            </div>

            {/* Delivery Method */}
            <div className="rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Método de Entrega</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    deliveryMethod === 'pickup' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <input
                    type="radio"
                    value="pickup"
                    {...register('delivery_method')}
                    className="sr-only"
                  />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    deliveryMethod === 'pickup' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Store size={20} />
                  </div>
                  <div>
                    <p className="font-medium">Retirada na Loja</p>
                    <p className="text-xs text-muted-foreground">Retire seu pedido no local</p>
                  </div>
                </label>
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                    deliveryMethod === 'delivery' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <input
                    type="radio"
                    value="delivery"
                    {...register('delivery_method')}
                    className="sr-only"
                  />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    deliveryMethod === 'delivery' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="font-medium">Entrega</p>
                    <p className="text-xs text-muted-foreground">Receba no seu endereço</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Shipping Address - only when delivery */}
            {deliveryMethod === 'delivery' && (
              <div className="rounded-lg border p-6">
                <h2 className="mb-4 text-lg font-semibold">Endereço de Entrega</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium">Endereço *</label>
                    <input {...register('shipping_address')} className="input" placeholder="Rua Principal, 123, Apto 4" />
                    {errors.shipping_address && <p className="mt-1 text-xs text-destructive">{errors.shipping_address.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Cidade *</label>
                    <input {...register('shipping_city')} className="input" placeholder="São Paulo" />
                    {errors.shipping_city && <p className="mt-1 text-xs text-destructive">{errors.shipping_city.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Estado *</label>
                    <input {...register('shipping_state')} className="input" placeholder="SP" />
                    {errors.shipping_state && <p className="mt-1 text-xs text-destructive">{errors.shipping_state.message}</p>}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">CEP *</label>
                    <input {...register('shipping_zip')} className="input" placeholder="01001-000" />
                    {errors.shipping_zip && <p className="mt-1 text-xs text-destructive">{errors.shipping_zip.message}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method - only for delivery */}
            {deliveryMethod === 'delivery' && (
              <div className="rounded-lg border p-6">
                <h2 className="mb-4 text-lg font-semibold">Forma de Pagamento</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PAYMENT_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const isSelected = paymentMethod === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                        }`}
                      >
                        <input
                          type="radio"
                          value={opt.value}
                          {...register('payment_method')}
                          className="sr-only"
                        />
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon size={20} />
                        </div>
                        <p className="font-medium">{opt.label}</p>
                      </label>
                    );
                  })}
                </div>
                {errors.payment_method && <p className="mt-2 text-xs text-destructive">{errors.payment_method.message}</p>}

                {paymentMethod === 'cash' && (
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-medium">Troco para quanto? (R$)</label>
                    <input
                      {...register('change_for')}
                      type="number"
                      step="0.01"
                      min="0"
                      className="input max-w-xs"
                      placeholder="0,00"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Deixe em branco se não precisa de troco.</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Observações</h2>
              <textarea {...register('notes')} className="input min-h-[80px] resize-y" placeholder="Alguma instrução especial..." />
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Resumo do Pedido</h2>
              <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
                {items.map(item => (
                  <div key={item.product_id} className="flex items-center gap-3">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">N/A</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 border-t pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span className="text-success">Grátis</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">R$ {totalPrice.toFixed(2)}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-lg mt-6 w-full gap-2"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? 'Confirmando Pedido...' : 'Confirmar Pedido'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
