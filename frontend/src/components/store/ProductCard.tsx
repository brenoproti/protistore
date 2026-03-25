import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, Eye } from 'lucide-react';
import type { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const image = product.images?.[0]?.url;
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100)
    : 0;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (added) return;
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: image || null,
      stock: product.stock,
      slug: product.slug,
    });
    setAdded(true);
    timerRef.current = setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link to={`/products/${product.slug}`} className="card card-hover group flex flex-col">
      <div className="relative aspect-square overflow-hidden bg-muted rounded-t-[14px]">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Sem imagem
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Quick view button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <span className="bg-white/90 backdrop-blur-sm text-foreground text-xs font-medium px-4 py-2 rounded-full flex items-center gap-1.5 shadow-lg translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
            <Eye size={14} /> Ver detalhes
          </span>
        </div>

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="badge bg-destructive text-white shadow-sm">
              -{discountPercent}%
            </span>
          )}
          {product.is_featured && !hasDiscount && (
            <span className="badge bg-accent text-gray-900 shadow-sm">
              Destaque
            </span>
          )}
        </div>

        {/* Out of stock overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
            <span className="bg-white text-foreground text-sm font-semibold px-4 py-1.5 rounded-full">Esgotado</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="text-sm font-medium leading-snug line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-200">
          {product.name}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex flex-col">
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through leading-none mb-0.5">
                R$ {product.compare_at_price!.toFixed(2)}
              </span>
            )}
            <span className="text-lg font-bold text-primary leading-none">
              R$ {product.price.toFixed(2)}
            </span>
          </div>
          {product.stock > 0 && (
            <button
              onClick={handleAddToCart}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 shrink-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${
                added
                  ? 'bg-success text-white scale-110'
                  : 'bg-primary/10 text-primary hover:bg-primary hover:text-white hover:shadow-md'
              }`}
              title="Adicionar ao carrinho"
            >
              {added ? <Check size={16} strokeWidth={3} /> : <ShoppingCart size={15} />}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
