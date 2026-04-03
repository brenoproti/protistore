import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatCurrency } from '@/lib/formatters';

export function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1280px] py-20 text-center">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-muted mb-6">
          <ShoppingBag size={36} className="text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="mb-8 text-muted-foreground max-w-md mx-auto">Parece que você ainda não adicionou nenhum item ao carrinho.</p>
        <Link to="/products" className="btn btn-primary btn-lg gap-2">
          Explorar Produtos <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Carrinho de Compras</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalItems} {totalItems === 1 ? 'item' : 'itens'}</p>
        </div>
        <Link to="/products" className="btn btn-ghost btn-sm gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Continuar Comprando
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="divide-y rounded-xl border bg-card">
            {items.map(item => (
              <div key={item.product_id} className="flex gap-4 p-4 sm:p-5 group/item">
                <Link to={`/products/${item.slug}`} className="shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl object-cover ring-1 ring-border" />
                  ) : (
                    <div className="flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
                      Sem imagem
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/products/${item.slug}`} className="font-medium hover:text-primary transition-colors leading-snug line-clamp-2">
                      {item.name}
                    </Link>
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="btn btn-ghost btn-icon btn-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground mt-0.5">
                    {formatCurrency(item.price)} cada
                  </span>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <div className="flex items-center rounded-lg border bg-muted/50 overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="flex items-center justify-center w-11 h-11 hover:bg-muted transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold border-x">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="flex items-center justify-center w-11 h-11 hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-base font-bold">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border bg-card p-6">
            <h2 className="mb-5 text-lg font-bold">Resumo do Pedido</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-success font-medium">Grátis</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(totalPrice)}</span>
                </div>
              </div>
            </div>
            <Link to="/checkout" className="btn btn-primary btn-lg mt-6 w-full gap-2">
              Finalizar Compra <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
