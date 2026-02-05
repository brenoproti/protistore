import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { adminBannerApi } from '@/lib/api';
import type { Banner } from '@/types';
import { toast } from 'sonner';

export function BannersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: () => adminBannerApi.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Banner>) =>
      editing ? adminBannerApi.update(editing.id, data) : adminBannerApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success(editing ? 'Banner atualizado' : 'Banner criado');
      closeModal();
    },
    onError: () => toast.error('Falha ao salvar banner'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminBannerApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
      toast.success('Banner excluído');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Falha ao excluir banner'),
  });

  function closeModal() { setModalOpen(false); setEditing(null); }
  function openCreate() { setEditing(null); setModalOpen(true); }
  function openEdit(banner: Banner) { setEditing(banner); setModalOpen(true); }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      title: fd.get('title') as string,
      subtitle: (fd.get('subtitle') as string) || null,
      image_url: fd.get('image_url') as string,
      link_url: (fd.get('link_url') as string) || null,
      sort_order: Number(fd.get('sort_order') || 0),
      is_active: fd.get('is_active') === 'on',
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Banners</h1>
        <button onClick={openCreate} className="btn btn-primary gap-2">
          <Plus size={16} /> Adicionar Banner
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-48" />)}
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-muted-foreground">
          Nenhum banner ainda. Crie seu primeiro banner.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {banners.map(banner => (
            <div key={banner.id} className="card overflow-hidden">
              <div className="relative aspect-[21/9]">
                <img src={banner.image_url} alt={banner.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 text-white">
                  <h3 className="font-semibold">{banner.title}</h3>
                  {banner.subtitle && <p className="text-sm opacity-80">{banner.subtitle}</p>}
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className={`badge text-xs ${banner.is_active ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}>
                    {banner.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-xs text-muted-foreground">Ordem: {banner.sort_order}</span>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(banner)} className="btn btn-ghost btn-icon btn-sm">
                    <Pencil size={14} />
                  </button>
                  {deleteConfirm === banner.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => deleteMutation.mutate(banner.id)} className="btn btn-destructive btn-sm">Excluir</button>
                      <button onClick={() => setDeleteConfirm(null)} className="btn btn-ghost btn-sm">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(banner.id)} className="btn btn-ghost btn-icon btn-sm text-destructive">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Banner' : 'Novo Banner'}</h2>
              <button onClick={closeModal} className="btn btn-ghost btn-icon btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Título *</label>
                <input name="title" defaultValue={editing?.title || ''} required className="input" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Subtítulo</label>
                <input name="subtitle" defaultValue={editing?.subtitle || ''} className="input" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">URL da Imagem *</label>
                <input name="image_url" defaultValue={editing?.image_url || ''} required className="input" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">URL do Link</label>
                <input name="link_url" defaultValue={editing?.link_url || ''} className="input" placeholder="/products" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Ordem</label>
                  <input name="sort_order" type="number" defaultValue={editing?.sort_order || 0} className="input" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input name="is_active" type="checkbox" defaultChecked={editing?.is_active ?? true} id="banner-active" />
                  <label htmlFor="banner-active" className="text-sm">Ativo</label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn btn-outline">Cancelar</button>
                <button type="submit" disabled={saveMutation.isPending} className="btn btn-primary gap-2">
                  {saveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {editing ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
