import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import type { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const image = product.images?.[0]?.url;
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: image || null,
      stock: product.stock,
      slug: product.slug,
    });
  };

  return (
    <Link to={`/products/${product.slug}`} className="card group flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Sem imagem
          </div>
        )}
        {hasDiscount && (
          <span className="badge absolute top-2 left-2 bg-destructive text-white">
            -{discountPercent}%
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="badge bg-foreground text-white text-sm">Esgotado</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-medium leading-tight line-clamp-2 mb-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-primary">
              R$ {product.price.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                R$ {product.compare_at_price!.toFixed(2)}
              </span>
            )}
          </div>
          {product.stock > 0 && (
            <button
              onClick={handleAddToCart}
              className="btn btn-primary btn-icon btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
              title="Adicionar ao carrinho"
            >
              <ShoppingCart size={14} />
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
