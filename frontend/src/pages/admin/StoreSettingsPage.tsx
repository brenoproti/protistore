import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Settings, Upload, X, ImageIcon } from 'lucide-react';
import { adminStoreApi, adminApi } from '@/lib/api';
import { toast } from 'sonner';

export function StoreSettingsPage() {
  const queryClient = useQueryClient();

  const { data: store, isLoading } = useQuery({
    queryKey: ['admin', 'store'],
    queryFn: () => adminStoreApi.getStore(),
  });

  const [form, setForm] = useState({
    name: '',
    description: '',
    logo_url: '' as string | null,
    whatsapp_number: '',
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (store) {
      setForm({
        name: store.name || '',
        description: store.description || '',
        logo_url: store.logo_url || null,
        whatsapp_number: store.whatsapp_number || '',
      });
    }
  }, [store]);

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      adminStoreApi.updateStore({
        name: data.name,
        description: data.description || null,
        logo_url: data.logo_url,
        whatsapp_number: data.whatsapp_number || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'store'] });
      toast.success('Configurações salvas');
    },
    onError: () => toast.error('Falha ao salvar configurações'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  function updateField(key: string, value: string | null) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const result = await adminApi.uploadFile(file);
      updateField('logo_url', result.url);
      toast.success('Logo enviada');
    } catch {
      toast.error('Falha ao enviar logo');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  }

  if (isLoading) {
    return <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-12" />)}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Settings size={24} className="text-primary" />
        <h1 className="text-2xl font-bold">Configurações da Loja</h1>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border p-6 space-y-5">
          <h2 className="font-semibold">Informações Gerais</h2>

          <div>
            <label className="mb-1 block text-sm font-medium">Nome da Loja</label>
            <input
              type="text"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              className="input"
              placeholder="Ex: Minha Loja"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Exibido no cabeçalho, rodapé e nos direitos reservados.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Descrição</label>
            <textarea
              value={form.description}
              onChange={e => updateField('description', e.target.value)}
              className="input min-h-[80px] resize-y"
              placeholder="Uma breve descrição da sua loja..."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Exibida no rodapé da loja.
            </p>
          </div>
        </div>

        {/* Logo */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">Logo</h2>

          {form.logo_url ? (
            <div className="flex items-start gap-4">
              <div className="relative group">
                <img
                  src={form.logo_url}
                  alt="Logo"
                  className="h-20 w-auto max-w-[200px] rounded-lg border object-contain bg-muted p-1"
                />
                <button
                  type="button"
                  onClick={() => updateField('logo_url', null)}
                  className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <label className="btn btn-outline btn-sm gap-1 cursor-pointer">
                  {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  Trocar
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                </label>
                <input
                  type="text"
                  value={form.logo_url}
                  onChange={e => updateField('logo_url', e.target.value)}
                  className="input text-xs"
                  placeholder="ou cole a URL"
                />
              </div>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary hover:bg-primary/5">
              {uploadingLogo ? (
                <Loader2 size={24} className="text-muted-foreground animate-spin" />
              ) : (
                <ImageIcon size={24} className="text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">{uploadingLogo ? 'Enviando...' : 'Clique para enviar a logo'}</p>
                <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Recomendado: 200x60px</p>
              </div>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            Exibida no cabeçalho da loja. Se vazia, mostra o nome da loja.
          </p>
        </div>

        {/* WhatsApp */}
        <div className="rounded-lg border p-6 space-y-4">
          <h2 className="font-semibold">WhatsApp</h2>
          <div>
            <input
              type="text"
              value={form.whatsapp_number}
              onChange={e => updateField('whatsapp_number', e.target.value)}
              className="input"
              placeholder="Ex: 5511999999999"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Número com código do país (sem +). Exibe um botão flutuante de WhatsApp na loja.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn btn-primary btn-lg w-full gap-2"
        >
          {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
          Salvar Configurações
        </button>
      </form>
    </div>
  );
}
