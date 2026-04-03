import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { storeApi } from '@/lib/api';
import type { Banner, Brand, Category, Product } from '@/types';
import { ProductCard } from '@/components/store/ProductCard';

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

function SectionHeader({ title, linkTo, linkText }: { title: string; linkTo: string; linkText: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h2>
      <Link to={linkTo} className="text-sm font-medium text-primary hover:text-primary-hover transition-colors flex items-center gap-1 group">
        {linkText} <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loaders
// ---------------------------------------------------------------------------

function BannerSkeleton() {
  return (
    <div>
      <div className="rounded-2xl overflow-hidden aspect-[3/1] skeleton" />
    </div>
  );
}

function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg overflow-hidden border border-border">
          <div className="aspect-square skeleton rounded-none" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-3/4 skeleton" />
            <div className="h-5 w-1/2 skeleton" />
          </div>
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
          <div className="aspect-[4/3] skeleton rounded-lg" />
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
    <div className="flex flex-col gap-10 sm:gap-12 pb-16">
      {/* ---- Banner ---- */}
      <section className="mx-auto w-full max-w-[1280px] pt-4 sm:pt-6">
        {bannersLoading ? (
          <BannerSkeleton />
        ) : banners && banners.length > 0 ? (
          (() => {
            const banner = banners[0];
            const Wrapper = banner.link_url ? Link : 'div';
            const wrapperProps = banner.link_url ? { to: banner.link_url } : {};
            return (
              // @ts-expect-error dynamic element
              <Wrapper {...wrapperProps} className="block rounded-2xl overflow-hidden">
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="w-full h-auto max-h-[480px] object-cover rounded-2xl"
                />
              </Wrapper>
            );
          })()
        ) : null}
      </section>

      {/* ---- Featured / Recent Products ---- */}
      <section className="mx-auto w-full max-w-[1280px]">
        <SectionHeader
          title={hasFeatured ? 'Produtos em Destaque' : 'Novidades'}
          linkTo={hasFeatured ? '/products?featured=true' : '/products'}
          linkText="Ver todos"
        />

        {productsLoading ? (
          <ProductGridSkeleton />
        ) : displayProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
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

      {/* ---- Categories ---- */}
      {(categoriesLoading || (categories && categories.length > 0)) && (
        <section className="mx-auto w-full max-w-[1280px]">
          <SectionHeader title="Comprar por Categoria" linkTo="/products" linkText="Todos os produtos" />

          {categoriesLoading ? (
            <CategoryGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {categories!.map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category_id=${category.id}`}
                  className="group relative flex flex-col items-center text-center rounded-xl overflow-hidden"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground text-3xl font-bold">
                        {category.name.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-sm font-semibold text-white drop-shadow-lg">
                      {category.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ---- Brands ---- */}
      {(brandsLoading || (brands && brands.length > 0)) && (
        <section className="mx-auto w-full max-w-[1280px]">
          <SectionHeader title="Navegue por Marca" linkTo="/products" linkText="Todos os produtos" />

          {brandsLoading ? (
            <CategoryGridSkeleton count={6} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {brands!.map((brand) => (
                <Link
                  key={brand.id}
                  to={`/products?brand_ids=${brand.id}`}
                  className="group relative flex flex-col items-center text-center rounded-xl overflow-hidden"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                    {brand.logo_url ? (
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <span className="text-muted-foreground text-3xl font-bold">
                        {brand.name.charAt(0)}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-sm font-semibold text-white drop-shadow-lg">
                      {brand.name}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
