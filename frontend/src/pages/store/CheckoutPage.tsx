import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { storeApi } from '@/lib/api';
import { toast } from 'sonner';

const checkoutSchema = z.object({
  customer_name: z.string().min(2, 'Nome é obrigatório'),
  customer_email: z.string().email('E-mail válido é obrigatório'),
  customer_phone: z.string().optional(),
  shipping_address: z.string().min(5, 'Endereço é obrigatório'),
  shipping_city: z.string().min(2, 'Cidade é obrigatória'),
  shipping_state: z.string().min(2, 'Estado é obrigatório'),
  shipping_zip: z.string().min(4, 'CEP é obrigatório'),
  notes: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, totalPrice, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
  });

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
      const order = await storeApi.checkout({
        ...data,
        customer_phone: data.customer_phone || undefined,
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

            <div className="rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Observações</h2>
              <textarea {...register('notes')} className="input min-h-[80px] resize-y" placeholder="Alguma instrução especial..." />
            </div>
          </div>

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
