import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload, ImageIcon, Trash2 } from 'lucide-react';
import { adminBannerApi, adminApi } from '@/lib/api';
import type { Banner } from '@/types';
import { toast } from 'sonner';

export function BannersPage() {
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: () => adminBannerApi.list(),
  });

  const banner = banners[0] ?? null;

  // Sync local state with fetched banner (once)
  if (banner && !initialized) {
    setImageUrl(banner.image_url);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Banner>) =>
      banner ? adminBannerApi.update(banner.id, data) : adminBannerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success('Banner salvo');
    },
    onError: () => toast.error('Falha ao salvar banner'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminBannerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      setImageUrl(null);
      setInitialized(false);
      toast.success('Banner removido');
    },
    onError: () => toast.error('Falha ao remover banner'),
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await adminApi.uploadFile(file);
      setImageUrl(result.url);
      toast.success('Imagem enviada');
    } catch {
      toast.error('Falha ao enviar imagem');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!imageUrl) {
      toast.error('Envie uma imagem para o banner');
      return;
    }
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      title: 'Banner',
      image_url: imageUrl,
      link_url: (fd.get('link_url') as string) || null,
      sort_order: 0,
      is_active: true,
    });
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Banner</h1>
        <div className="skeleton h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Banner</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Imagem exibida no topo da loja. Tamanho recomendado: 1400 x 400px (7:2)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Image upload */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          {imageUrl ? (
            <div className="relative group">
              <div className="aspect-[7/2] w-full overflow-hidden rounded-lg border border-border bg-muted">
                <img src={imageUrl} alt="Banner" className="h-full w-full object-cover" />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg"
              >
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium flex items-center gap-1.5">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading ? 'Enviando...' : 'Trocar imagem'}
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full aspect-[7/2] rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/50 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              ) : (
                <ImageIcon size={32} className="text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? 'Enviando...' : 'Clique para enviar imagem'}
              </span>
              <span className="text-xs text-muted-foreground/60">
                Recomendado: 1400 x 400px
              </span>
            </button>
          )}
        </div>

        {/* Link URL */}
        <div>
          <label className="mb-1 block text-sm font-medium">URL do Link (opcional)</label>
          <input
            name="link_url"
            defaultValue={banner?.link_url || ''}
            className="input"
            placeholder="/products"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Ao clicar no banner, o usuário será redirecionado para este link.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saveMutation.isPending || uploading || !imageUrl}
            className="btn btn-primary gap-2"
          >
            {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Salvar Banner
          </button>
          {banner && (
            <button
              type="button"
              onClick={() => deleteMutation.mutate(banner.id)}
              disabled={deleteMutation.isPending}
              className="btn btn-outline text-destructive gap-2"
            >
              {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Remover
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
