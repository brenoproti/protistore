import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import {
  Minus,
  Plus,
  ShoppingCart,
  ChevronRight,
  Package,
  AlertTriangle,
  XCircle,
  Check,
  Shield,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { storeApi } from '@/lib/api';
import type { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { ProductCard } from '@/components/store/ProductCard';
import { formatCurrency } from '@/lib/formatters';

interface ProductDetailResponse {
  product: Product;
  related: Product[];
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1280px] py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="flex flex-col gap-3">
          <div className="aspect-square skeleton rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-20 h-20 skeleton shrink-0 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-5 w-48 skeleton" />
          <div className="h-8 w-3/4 skeleton" />
          <div className="h-10 w-1/3 skeleton" />
          <div className="h-px bg-border my-2" />
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-2/3 skeleton" />
          <div className="h-12 w-full skeleton mt-4 rounded-lg" />
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
      <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
        <XCircle size={18} />
        <span className="text-sm font-medium">Sem Estoque</span>
      </div>
    );
  }
  if (stock <= 5) {
    return (
      <div className="flex items-center gap-2 text-warning bg-warning/10 px-3 py-2 rounded-lg">
        <AlertTriangle size={18} />
        <span className="text-sm font-medium">
          Estoque Baixo &mdash; apenas {stock} restantes
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-success bg-success/10 px-3 py-2 rounded-lg">
      <Package size={18} />
      <span className="text-sm font-medium">Em Estoque</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quantity Selector
// ---------------------------------------------------------------------------

function QuantitySelector({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-xl border border-border overflow-hidden bg-muted/50">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className="flex items-center justify-center w-11 h-11 hover:bg-muted transition-colors disabled:opacity-30"
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
          if (!Number.isNaN(num) && num >= 1 && num <= max) onChange(num);
        }}
        className="w-12 h-11 text-center text-sm font-semibold border-x border-border bg-card outline-none"
        aria-label="Quantidade"
      />
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex items-center justify-center w-11 h-11 hover:bg-muted transition-colors disabled:opacity-30"
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
      <div className="aspect-square bg-muted flex items-center justify-center rounded-2xl text-muted-foreground text-lg">
        Sem imagem disponível
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square rounded-2xl bg-muted overflow-hidden">
        <img
          src={mainImage!.url}
          alt={mainImage!.alt_text || 'Imagem do produto'}
          className="h-full w-full object-contain"
        />
      </div>
      {sorted.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 pt-1 px-1">
          {sorted.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setSelectedIdx(idx)}
              className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden ring-2 transition-all duration-200 ${
                idx === selectedIdx
                  ? 'ring-primary ring-offset-2'
                  : 'ring-transparent hover:ring-border opacity-70 hover:opacity-100'
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
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const { data, isLoading, isError } = useQuery<ProductDetailResponse>({
    queryKey: ['product', slug],
    queryFn: () => storeApi.getProductBySlug(slug!) as Promise<ProductDetailResponse>,
    enabled: !!slug,
  });

  const product = data?.product;
  const related = data?.related ?? [];

  const hasDiscount = product?.compare_at_price != null && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product!.compare_at_price! - product!.price) / product!.compare_at_price!) * 100)
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
    timerRef.current = setTimeout(() => setAddedToCart(false), 2000);
  };

  if (isLoading) return <DetailSkeleton />;

  if (isError || !product) {
    return (
      <div className="mx-auto w-full max-w-[1280px] py-20 text-center">
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
    <div className="mx-auto w-full max-w-[1280px] py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-8 flex-wrap">
        <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
        <ChevronRight size={14} className="opacity-40" />
        <Link to="/products" className="hover:text-foreground transition-colors">Produtos</Link>
        {product.category && (
          <>
            <ChevronRight size={14} className="opacity-40" />
            <Link to={`/products?category_id=${product.category.id}`} className="hover:text-foreground transition-colors">
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight size={14} className="opacity-40" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
        <ImageGallery images={product.images} />

        <div className="flex flex-col gap-5">
          {/* Brand */}
          {product.brand && (
            <span className="text-sm text-primary font-medium uppercase tracking-wide">
              {product.brand.name}
            </span>
          )}

          {/* Name */}
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
            {product.name}
          </h1>

          {/* Price */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-3xl font-bold text-primary">
              {formatCurrency(product.price)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatCurrency(product.compare_at_price!)}
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
            <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
          )}

          <hr className="border-border" />

          {/* Description */}
          {product.description && (
            <div
              className="prose prose-sm max-w-none text-foreground/80 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
            />
          )}

          <hr className="border-border" />

          {/* Quantity + Add to Cart */}
          {product.stock > 0 ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantidade:</span>
                <QuantitySelector value={quantity} max={product.stock} onChange={setQuantity} />
              </div>

              <button
                onClick={handleAddToCart}
                className={`btn btn-lg w-full sm:w-auto gap-2 transition-all duration-200 ${
                  addedToCart
                    ? 'bg-success hover:bg-success text-white'
                    : 'btn-primary'
                }`}
              >
                {addedToCart ? (
                  <><Check size={20} /> Adicionado!</>
                ) : (
                  <><ShoppingCart size={20} /> Adicionar ao Carrinho</>
                )}
              </button>
            </div>
          ) : (
            <button disabled className="btn btn-primary btn-lg w-full sm:w-auto opacity-50 cursor-not-allowed">
              Esgotado
            </button>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="flex flex-col items-center text-center gap-1.5 p-3 rounded-xl bg-muted/50">
              <Shield size={18} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground leading-tight">Compra Segura</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 p-3 rounded-xl bg-muted/50">
              <Truck size={18} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground leading-tight">Entrega Rápida</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5 p-3 rounded-xl bg-muted/50">
              <RotateCcw size={18} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground leading-tight">Troca Fácil</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-20">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">Produtos Relacionados</h2>
            <div className="mt-1.5 h-1 w-12 rounded-full bg-primary" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
