import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronRight } from 'lucide-react';
import { storeApi } from '@/lib/api';
import type { Banner, Brand, Category, Product } from '@/types';
import { ProductCard } from '@/components/store/ProductCard';

// ---------------------------------------------------------------------------
// Banner Carousel
// ---------------------------------------------------------------------------

function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {banners.map((banner) => {
            const Wrapper = banner.link_url ? Link : 'div';
            const wrapperProps = banner.link_url
              ? { to: banner.link_url }
              : {};

            return (
              <div
                key={banner.id}
                className="relative min-w-0 flex-[0_0_100%]"
              >
                {/* @ts-expect-error dynamic element */}
                <Wrapper {...wrapperProps} className="block">
                  <div className="relative aspect-[21/9] sm:aspect-[21/7] w-full overflow-hidden bg-muted">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                    />
                    {/* Overlay with text */}
                    {(banner.title || banner.subtitle) && (
                      <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/50 to-transparent">
                        <div className="max-w-2xl px-6 sm:px-12 lg:px-20">
                          {banner.title && (
                            <h2 className="text-xl sm:text-3xl lg:text-5xl font-bold text-white mb-2 sm:mb-4">
                              {banner.title}
                            </h2>
                          )}
                          {banner.subtitle && (
                            <p className="text-sm sm:text-lg text-white/90">
                              {banner.subtitle}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </Wrapper>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? 'w-6 bg-white'
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function BannerSkeleton() {
  return (
    <div className="w-full aspect-[21/9] sm:aspect-[21/7] skeleton" />
  );
}

function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="aspect-square skeleton" />
          <div className="h-4 w-3/4 skeleton" />
          <div className="h-4 w-1/2 skeleton" />
        </div>
      ))}
    </div>
  );
}

function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="aspect-[4/3] skeleton" />
          <div className="h-4 w-2/3 mx-auto skeleton" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Home Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const {
    data: banners,
    isLoading: bannersLoading,
  } = useQuery<Banner[]>({
    queryKey: ['banners'],
    queryFn: () => storeApi.getBanners(),
  });

  const {
    data: featuredData,
    isLoading: featuredLoading,
  } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: () => storeApi.getProducts({ featured: true, per_page: 8 }),
  });

  const {
    data: recentData,
    isLoading: recentLoading,
  } = useQuery({
    queryKey: ['products', 'recent'],
    queryFn: () => storeApi.getProducts({ per_page: 8 }),
    // Only fetch if featured returned empty
    enabled: !featuredLoading && (featuredData?.data ?? []).length === 0,
  });

  const {
    data: categories,
    isLoading: categoriesLoading,
  } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: () => storeApi.getCategories(),
  });

  const {
    data: brands,
    isLoading: brandsLoading,
  } = useQuery<Brand[]>({
    queryKey: ['brands'],
    queryFn: () => storeApi.getBrands(),
  });

  const featuredProducts: Product[] = featuredData?.data ?? [];
  const hasFeatured = featuredProducts.length > 0;
  const displayProducts: Product[] = hasFeatured ? featuredProducts : (recentData?.data ?? []);
  const productsLoading = featuredLoading || (!hasFeatured && recentLoading);

  return (
    <div className="flex flex-col gap-10 pb-12">
      {/* ---- Banner Carousel ---- */}
      <section>
        {bannersLoading ? (
          <BannerSkeleton />
        ) : banners && banners.length > 0 ? (
          <BannerCarousel banners={banners} />
        ) : null}
      </section>

      {/* ---- Featured / Recent Products ---- */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {hasFeatured ? 'Produtos em Destaque' : 'Novidades'}
          </h2>
          <Link
            to={hasFeatured ? '/products?featured=true' : '/products'}
            className="btn btn-ghost gap-1 text-primary"
          >
            Ver todos <ChevronRight size={16} />
          </Link>
        </div>

        {productsLoading ? (
          <ProductGridSkeleton />
        ) : displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">
            Nenhum produto disponível ainda.
          </p>
        )}
      </section>

      {/* ---- Brands ---- */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Navegue por Marca</h2>
          <Link
            to="/products"
            className="btn btn-ghost gap-1 text-primary"
          >
            Todos os produtos <ChevronRight size={16} />
          </Link>
        </div>

        {brandsLoading ? (
          <CategoryGridSkeleton count={6} />
        ) : brands && brands.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                to={`/products?brand_ids=${brand.id}`}
                className="card group flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted flex items-center justify-center p-4">
                  {brand.logo_url ? (
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-muted-foreground text-3xl font-bold">
                      {brand.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                    {brand.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      {/* ---- Categories ---- */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Comprar por Categoria</h2>
          <Link
            to="/products"
            className="btn btn-ghost gap-1 text-primary"
          >
            Todos os produtos <ChevronRight size={16} />
          </Link>
        </div>

        {categoriesLoading ? (
          <CategoryGridSkeleton />
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category_id=${category.id}`}
                className="card group flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground text-3xl font-bold">
                      {category.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-12">
            Nenhuma categoria disponível.
          </p>
        )}
      </section>
    </div>
  );
}
