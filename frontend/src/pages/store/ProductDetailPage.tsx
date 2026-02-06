import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Minus,
  Plus,
  ShoppingCart,
  ChevronRight,
  Package,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { storeApi } from '@/lib/api';
import type { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { ProductCard } from '@/components/store/ProductCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductDetailResponse {
  product: Product;
  related: Product[];
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image skeleton */}
        <div className="flex flex-col gap-3">
          <div className="aspect-square skeleton" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-20 h-20 skeleton shrink-0" />
            ))}
          </div>
        </div>
        {/* Info skeleton */}
        <div className="flex flex-col gap-4">
          <div className="h-8 w-3/4 skeleton" />
          <div className="h-6 w-1/3 skeleton" />
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-2/3 skeleton" />
          <div className="h-12 w-full skeleton mt-4" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stock Indicator
// ---------------------------------------------------------------------------

function StockIndicator({ stock }: { stock: number }) {
  if (stock === 0) {
    return (
      <div className="flex items-center gap-2 text-destructive">
        <XCircle size={18} />
        <span className="text-sm font-medium">Sem Estoque</span>
      </div>
    );
  }
  if (stock <= 5) {
    return (
      <div className="flex items-center gap-2 text-warning">
        <AlertTriangle size={18} />
        <span className="text-sm font-medium">
          Estoque Baixo &mdash; apenas {stock} restantes
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-success">
      <Package size={18} />
      <span className="text-sm font-medium">Em Estoque</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quantity Selector
// ---------------------------------------------------------------------------

function QuantitySelector({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center border border-border rounded-lg overflow-hidden w-fit">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className="btn btn-ghost btn-icon rounded-none border-r border-border"
        aria-label="Diminuir quantidade"
      >
        <Minus size={16} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const num = parseInt(e.target.value, 10);
          if (!Number.isNaN(num) && num >= 1 && num <= max) {
            onChange(num);
          }
        }}
        className="w-14 h-full text-center text-sm font-medium border-none outline-none bg-transparent"
        aria-label="Quantidade"
      />
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="btn btn-ghost btn-icon rounded-none border-l border-border"
        aria-label="Aumentar quantidade"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image Gallery
// ---------------------------------------------------------------------------

function ImageGallery({ images }: { images: Product['images'] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const sorted = useMemo(
    () => [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [images],
  );

  const mainImage = sorted[selectedIdx] ?? null;

  if (sorted.length === 0) {
    return (
      <div className="aspect-square bg-muted flex items-center justify-center rounded-lg text-muted-foreground text-lg">
        Sem imagem disponível
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        <img
          src={mainImage!.url}
          alt={mainImage!.alt_text || 'Imagem do produto'}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {sorted.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setSelectedIdx(idx)}
              className={`relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                idx === selectedIdx
                  ? 'border-primary'
                  : 'border-transparent hover:border-border'
              }`}
            >
              <img
                src={img.url}
                alt={img.alt_text || `Miniatura ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product Detail Page
// ---------------------------------------------------------------------------

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const { data, isLoading, isError } = useQuery<ProductDetailResponse>({
    queryKey: ['product', slug],
    queryFn: () => storeApi.getProductBySlug(slug!) as Promise<ProductDetailResponse>,
    enabled: !!slug,
  });

  const product = data?.product;
  const related = data?.related ?? [];

  // ---- Derived ----
  const hasDiscount =
    product?.compare_at_price != null &&
    product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product!.compare_at_price! - product!.price) /
          product!.compare_at_price!) *
          100,
      )
    : 0;

  const handleAddToCart = () => {
    if (!product || product.stock === 0) return;
    addItem(
      {
        product_id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0]?.url || null,
        stock: product.stock,
        slug: product.slug,
      },
      quantity,
    );
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  // ---- Loading ----
  if (isLoading) return <DetailSkeleton />;

  // ---- Error ----
  if (isError || !product) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">Produto não encontrado</h1>
        <p className="text-muted-foreground mb-6">
          O produto que você está procurando não existe ou foi removido.
        </p>
        <Link to="/products" className="btn btn-primary">
          Ver Produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* ---- Breadcrumb ---- */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link to="/" className="hover:text-foreground transition-colors">
          Início
        </Link>
        <ChevronRight size={14} />
        <Link to="/products" className="hover:text-foreground transition-colors">
          Produtos
        </Link>
        {product.category && (
          <>
            <ChevronRight size={14} />
            <Link
              to={`/products?category_id=${product.category.id}`}
              className="hover:text-foreground transition-colors"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight size={14} />
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {product.name}
        </span>
      </nav>

      {/* ---- Main content ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Image Gallery */}
        <ImageGallery images={product.images} />

        {/* Product Info */}
        <div className="flex flex-col gap-5">
          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            {product.name}
          </h1>

          {/* Brand */}
          {product.brand && (
            <p className="text-sm text-muted-foreground">
              Marca:{' '}
              <span className="font-medium text-foreground">
                {product.brand.name}
              </span>
            </p>
          )}

          {/* Price */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl font-bold text-primary">
              R$ {product.price.toFixed(2)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  R$ {product.compare_at_price!.toFixed(2)}
                </span>
                <span className="badge bg-destructive text-white">
                  -{discountPercent}% OFF
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <StockIndicator stock={product.stock} />

          {/* SKU */}
          {product.sku && (
            <p className="text-xs text-muted-foreground">
              SKU: {product.sku}
            </p>
          )}

          {/* Separator */}
          <hr className="border-border" />

          {/* Description */}
          {product.description && (
            <div
              className="prose prose-sm max-w-none text-foreground/90"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          )}

          {/* Separator */}
          <hr className="border-border" />

          {/* Quantity + Add to Cart */}
          {product.stock > 0 ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantidade:</span>
                <QuantitySelector
                  value={quantity}
                  max={product.stock}
                  onChange={setQuantity}
                />
              </div>

              <button
                onClick={handleAddToCart}
                className="btn btn-primary btn-lg gap-2 w-full sm:w-auto"
              >
                <ShoppingCart size={20} />
                {addedToCart ? 'Adicionado!' : 'Adicionar ao Carrinho'}
              </button>
            </div>
          ) : (
            <button disabled className="btn btn-primary btn-lg w-full sm:w-auto opacity-50 cursor-not-allowed">
              Esgotado
            </button>
          )}
        </div>
      </div>

      {/* ---- Related Products ---- */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Produtos Relacionados</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
