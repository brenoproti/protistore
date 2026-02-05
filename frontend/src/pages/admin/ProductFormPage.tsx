import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Plus, X, Loader2, Upload } from 'lucide-react';
import { adminProductApi, adminCategoryApi, adminBrandApi, adminApi } from '@/lib/api';
import { toast } from 'sonner';
import { Select } from '@/components/ui/Select';

const productSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  slug: z.string().min(1, 'O slug é obrigatório'),
  description: z.string().optional(),
  category_id: z.number().nullable().optional(),
  brand_id: z.number().nullable().optional(),
  price: z.number().min(0, 'O preço deve ser >= 0'),
  compare_at_price: z.number().nullable().optional(),
  cost_price: z.number().nullable().optional(),
  sku: z.string().optional(),
  stock: z.number().int().min(0),
  is_active: z.boolean(),
  is_featured: z.boolean(),
});

type ProductForm = z.infer<typeof productSchema>;

interface ImageItem {
  url: string;
  alt_text?: string;
  sort_order: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrlValue, setImageUrlValue] = useState('');

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['admin', 'product', id],
    queryFn: () => adminProductApi.get(Number(id)),
    enabled: isEdit,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminCategoryApi.list(),
  });

  const { data: brands = [] } = useQuery({
    queryKey: ['admin', 'brands'],
    queryFn: () => adminBrandApi.list(),
  });

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', slug: '', description: '', price: 0, stock: 0,
      is_active: true, is_featured: false,
      category_id: null, brand_id: null,
      compare_at_price: null, cost_price: null, sku: '',
    },
  });

  const nameValue = watch('name');
  useEffect(() => {
    if (!isEdit && !slugManuallyEdited && nameValue) {
      setValue('slug', slugify(nameValue));
    }
  }, [nameValue, isEdit, slugManuallyEdited, setValue]);

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        category_id: product.category_id,
        brand_id: product.brand_id,
        price: product.price,
        compare_at_price: product.compare_at_price,
        cost_price: product.cost_price,
        sku: product.sku || '',
        stock: product.stock,
        is_active: product.is_active,
        is_featured: product.is_featured,
      });
      setImages(
        (product.images || []).map((img, i) => ({
          url: img.url,
          alt_text: img.alt_text || undefined,
          sort_order: img.sort_order || i,
        }))
      );
    }
  }, [product, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: ProductForm & { images: ImageItem[] }) => {
      const payload = {
        ...data,
        category_id: data.category_id || null,
        brand_id: data.brand_id || null,
        images: data.images.map((img, i) => ({ url: img.url, alt_text: img.alt_text || null, sort_order: i })),
      };
      return isEdit ? adminProductApi.update(Number(id), payload) : adminProductApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success(isEdit ? 'Produto atualizado' : 'Produto criado');
      navigate('/admin/products');
    },
    onError: () => toast.error('Falha ao salvar produto'),
  });

  const onSubmit = (data: ProductForm) => {
    saveMutation.mutate({ ...data, images });
  };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await adminApi.uploadFile(file);
        setImages(prev => [...prev, { url: result.url, sort_order: prev.length }]);
      }
      toast.success('Imagem(ns) enviada(s)');
    } catch {
      toast.error('Falha ao enviar imagem');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function removeImage(index: number) {
    setImages(prev => prev.filter((_, i) => i !== index));
  }

  function addImageUrl() {
    if (!imageUrlValue.trim()) return;
    setImages(prev => [...prev, { url: imageUrlValue.trim(), sort_order: prev.length }]);
    setImageUrlValue('');
    setShowUrlInput(false);
  }

  if (isEdit && loadingProduct) {
    return <div className="space-y-4">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12" />)}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <button onClick={() => navigate('/admin/products')} className="btn btn-ghost btn-sm gap-1 mb-3">
          <ArrowLeft size={16} /> Voltar aos Produtos
        </button>
        <h1 className="text-2xl font-bold">{isEdit ? 'Editar Produto' : 'Novo Produto'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main info */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold">Informações Básicas</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Nome *</label>
                  <input {...register('name')} className="input" />
                  {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Slug *</label>

                  <input {...register('slug', { onChange: () => setSlugManuallyEdited(true) })} className="input" />
                  {errors.slug && <p className="mt-1 text-xs text-destructive">{errors.slug.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Categoria</label>
                  <Controller
                    name="category_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value != null ? String(field.value) : ''}
                        onChange={v => field.onChange(v ? Number(v) : null)}
                        placeholder="Nenhum(a)"
                        options={categories.map(c => ({ value: String(c.id), label: c.name }))}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Marca</label>
                  <Controller
                    name="brand_id"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value != null ? String(field.value) : ''}
                        onChange={v => field.onChange(v ? Number(v) : null)}
                        placeholder="Nenhum(a)"
                        options={brands.map(b => ({ value: String(b.id), label: b.name }))}
                      />
                    )}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Descrição</label>
                  <textarea {...register('description')} className="input min-h-[120px] resize-y" />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold">Preço e Estoque</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Preço *</label>
                  <input {...register('price', { valueAsNumber: true })} type="number" step="0.01" className="input" />
                  {errors.price && <p className="mt-1 text-xs text-destructive">{errors.price.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Preço Comparativo</label>
                  <input {...register('compare_at_price', { setValueAs: v => v ? Number(v) : null })} type="number" step="0.01" className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Preço de Custo</label>
                  <input {...register('cost_price', { setValueAs: v => v ? Number(v) : null })} type="number" step="0.01" className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">SKU</label>
                  <input {...register('sku')} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Estoque *</label>
                  <input {...register('stock', { valueAsNumber: true })} type="number" className="input" />
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold">Imagens</h2>
              {images.length === 0 ? (
                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary hover:bg-primary/5">
                  <Upload size={24} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Clique para enviar</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG ou WebP</p>
                  </div>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border">
                      <img src={img.url} alt={img.alt_text || ''} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 badge bg-primary text-white text-[10px]">Principal</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <label className="btn btn-outline btn-sm gap-1 flex-1 cursor-pointer justify-center">
                  <Upload size={14} /> Enviar
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
                <button type="button" onClick={() => setShowUrlInput(v => !v)} className="btn btn-outline btn-sm gap-1 flex-1">
                  <Plus size={14} /> URL
                </button>
              </div>
              {showUrlInput && (
                <div className="flex gap-2 animate-in">
                  <input
                    type="url"
                    value={imageUrlValue}
                    onChange={e => setImageUrlValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } if (e.key === 'Escape') { setShowUrlInput(false); setImageUrlValue(''); } }}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="input flex-1 text-sm"
                    autoFocus
                  />
                  <button type="button" onClick={addImageUrl} disabled={!imageUrlValue.trim()} className="btn btn-primary btn-sm">
                    Adicionar
                  </button>
                </div>
              )}
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Enviando...
                </div>
              )}
            </div>

            <div className="rounded-lg border p-6 space-y-4">
              <h2 className="font-semibold">Status</h2>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input {...register('is_active')} type="checkbox" id="prod-active" />
                  <label htmlFor="prod-active" className="text-sm">Ativo (visível na loja)</label>
                </div>
                <div className="flex items-center gap-2">
                  <input {...register('is_featured')} type="checkbox" id="prod-featured" />
                  <label htmlFor="prod-featured" className="text-sm">Produto em destaque</label>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn btn-primary btn-lg w-full gap-2"
            >
              {saveMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? 'Atualizar Produto' : 'Criar Produto'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
