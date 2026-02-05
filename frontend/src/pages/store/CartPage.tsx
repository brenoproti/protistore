import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice, totalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <ShoppingBag size={64} className="mx-auto mb-4 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="mb-6 text-muted-foreground">Parece que você ainda não adicionou nenhum item.</p>
        <Link to="/products" className="btn btn-primary btn-lg">
          Ver Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Carrinho de Compras ({totalItems} itens)</h1>
        <Link to="/products" className="btn btn-ghost btn-sm gap-1">
          <ArrowLeft size={16} /> Continuar Comprando
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="divide-y rounded-lg border">
            {items.map(item => (
              <div key={item.product_id} className="flex gap-4 p-4">
                <Link to={`/products/${item.slug}`} className="shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-24 w-24 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                      Sem imagem
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between">
                    <Link to={`/products/${item.slug}`} className="font-medium hover:text-primary transition-colors">
                      {item.name}
                    </Link>
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="btn btn-ghost btn-icon btn-sm text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    R$ {item.price.toFixed(2)} cada
                  </span>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 rounded-lg border">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="btn btn-ghost btn-icon btn-sm"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="btn btn-ghost btn-icon btn-sm"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="font-semibold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Resumo do Pedido</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-success">Grátis</span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">R$ {totalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <Link to="/checkout" className="btn btn-primary btn-lg mt-6 w-full">
              Finalizar Compra
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
