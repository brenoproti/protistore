import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { adminCategoryApi } from '@/lib/api';
import type { Category } from '@/types';
import { toast } from 'sonner';
import { Select } from '@/components/ui/Select';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [slugValue, setSlugValue] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [parentIdValue, setParentIdValue] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => adminCategoryApi.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Category>) =>
      editing ? adminCategoryApi.update(editing.id, data) : adminCategoryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success(editing ? 'Categoria atualizada' : 'Categoria criada');
      closeModal();
    },
    onError: () => toast.error('Falha ao salvar categoria'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminCategoryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      toast.success('Categoria excluída');
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Falha ao excluir categoria'),
  });

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setSlugValue('');
    setSlugManuallyEdited(false);
    setParentIdValue('');
  }

  function openCreate() {
    setEditing(null);
    setSlugValue('');
    setSlugManuallyEdited(false);
    setParentIdValue('');
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditing(cat);
    setSlugValue(cat.slug);
    setSlugManuallyEdited(true);
    setParentIdValue(cat.parent_id ? String(cat.parent_id) : '');
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveMutation.mutate({
      name: fd.get('name') as string,
      slug: fd.get('slug') as string,
      description: (fd.get('description') as string) || undefined,
      image_url: (fd.get('image_url') as string) || undefined,
      parent_id: parentIdValue ? Number(parentIdValue) : null,
      sort_order: Number(fd.get('sort_order') || 0),
      is_active: fd.get('is_active') === 'on',
    });
  }

  const parentOptions = categories.filter(c => !editing || c.id !== editing.id);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categorias</h1>
        <button onClick={openCreate} className="btn btn-primary gap-2">
          <Plus size={16} /> Adicionar Categoria
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-muted-foreground">
          Nenhuma categoria ainda. Crie sua primeira categoria.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Pai</th>
                <th className="px-4 py-3 text-left font-medium">Ordem</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map(cat => {
                const parent = categories.find(c => c.id === cat.parent_id);
                return (
                  <tr key={cat.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {cat.parent_id && <span className="text-muted-foreground mr-2">└</span>}
                      {cat.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{cat.slug}</td>
                    <td className="px-4 py-3 text-muted-foreground">{parent?.name || '—'}</td>
                    <td className="px-4 py-3">{cat.sort_order}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${cat.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {cat.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(cat)} className="btn btn-ghost btn-icon btn-sm">
                          <Pencil size={14} />
                        </button>
                        {deleteConfirm === cat.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => deleteMutation.mutate(cat.id)} className="btn btn-destructive btn-sm">Excluir</button>
                            <button onClick={() => setDeleteConfirm(null)} className="btn btn-ghost btn-sm">Cancelar</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(cat.id)} className="btn btn-ghost btn-icon btn-sm text-destructive">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeModal}>
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? 'Editar Categoria' : 'Nova Categoria'}</h2>
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
                <label className="mb-1 block text-sm font-medium">Categoria Pai</label>
                <Select
                  name="parent_id"
                  value={parentIdValue}
                  onChange={setParentIdValue}
                  placeholder="Nenhuma (Nível Superior)"
                  options={parentOptions.map(c => ({ value: String(c.id), label: c.name }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Ordem</label>
                  <input name="sort_order" type="number" defaultValue={editing?.sort_order || 0} className="input" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">URL da Imagem</label>
                  <input name="image_url" defaultValue={editing?.image_url || ''} className="input" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Descrição</label>
                <textarea name="description" defaultValue={editing?.description || ''} className="input min-h-[60px] resize-y" />
              </div>
              <div className="flex items-center gap-2">
                <input name="is_active" type="checkbox" defaultChecked={editing?.is_active ?? true} id="cat-active" />
                <label htmlFor="cat-active" className="text-sm">Ativo</label>
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
