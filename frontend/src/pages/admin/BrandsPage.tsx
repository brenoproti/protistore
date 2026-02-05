import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { adminBrandApi } from '@/lib/api';
import type { Brand } from '@/types';
import { toast } from 'sonner';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function BrandsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [slugValue, setSlugValue] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['admin', 'brands'],
    queryFn: () => adminBrandApi.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Brand>) =>
      editing ? adminBrandApi.update(editing.id, data) : adminBrandApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'brands'] });
      toast.success(editing ? 'Marca atualizada' : 'Marca criada');
      closeModal();
    },
    onError: () => toast.error('Falha ao salvar marca'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminBrandApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'brands'] });
      toast.success('Marca excluída');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Falha ao excluir marca'),
  });

  function closeModal() { setModalOpen(false); setEditing(null); setSlugValue(''); setSlugManuallyEdited(false); }
  function openCreate() { setEditing(null); setSlugValue(''); setSlugManuallyEdited(false); setModalOpen(true); }
  function openEdit(brand: Brand) { setEditing(brand); setSlugValue(brand.slug); setSlugManuallyEdited(true); setModalOpen(true); }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      name: fd.get('name') as string,
      slug: fd.get('slug') as string,
      logo_url: (fd.get('logo_url') as string) || null,
      is_active: fd.get('is_active') === 'on',
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Marcas</h1>
        <button onClick={openCreate} className="btn btn-primary gap-2">
          <Plus size={16} /> Adicionar Marca
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14" />)}
        </div>
      ) : brands.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-muted-foreground">
          Nenhuma marca ainda. Crie sua primeira marca.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Logo</th>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {brands.map(brand => (
                <tr key={brand.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {brand.logo_url ? (
                      <img src={brand.logo_url} alt={brand.name} className="h-8 w-8 rounded object-contain" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-bold">
                        {brand.name[0]}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{brand.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{brand.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${brand.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                      {brand.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(brand)} className="btn btn-ghost btn-icon btn-sm">
                        <Pencil size={14} />
                      </button>
                      {deleteConfirm === brand.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => deleteMutation.mutate(brand.id)} className="btn btn-destructive btn-sm">Excluir</button>
                          <button onClick={() => setDeleteConfirm(null)} className="btn btn-ghost btn-sm">Cancelar</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(brand.id)} className="btn btn-ghost btn-icon btn-sm text-destructive">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Marca' : 'Nova Marca'}</h2>
              <button onClick={closeModal} className="btn btn-ghost btn-icon btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome *</label>
                <input
                  name="name"
                  defaultValue={editing?.name || ''}
                  required
                  className="input"
                  onChange={e => { if (!slugManuallyEdited) setSlugValue(slugify(e.target.value)); }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Slug *</label>
                <input
                  name="slug"
                  value={slugValue}
                  required
                  className="input"
                  onChange={e => { setSlugManuallyEdited(true); setSlugValue(e.target.value); }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">URL do Logo</label>
                <input name="logo_url" defaultValue={editing?.logo_url || ''} className="input" />
              </div>
              <div className="flex items-center gap-2">
                <input name="is_active" type="checkbox" defaultChecked={editing?.is_active ?? true} id="brand-active" />
                <label htmlFor="brand-active" className="text-sm">Ativo</label>
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
