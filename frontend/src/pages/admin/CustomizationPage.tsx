import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Palette } from 'lucide-react';
import { adminStoreApi } from '@/lib/api';
import type { StoreCustomization } from '@/types';
import { toast } from 'sonner';
import { Select } from '@/components/ui/Select';

const COLOR_FIELDS: { key: keyof StoreCustomization; label: string }[] = [
  { key: 'primary_color', label: 'Cor Primária' },
  { key: 'secondary_color', label: 'Cor Secundária' },
  { key: 'accent_color', label: 'Cor de Destaque' },
  { key: 'background_color', label: 'Cor de Fundo' },
  { key: 'text_color', label: 'Cor do Texto' },
  { key: 'header_bg_color', label: 'Fundo do Cabeçalho' },
  { key: 'footer_bg_color', label: 'Fundo do Rodapé' },
];

export function CustomizationPage() {
  const queryClient = useQueryClient();
  const { data: customization, isLoading } = useQuery({
    queryKey: ['admin', 'customization'],
    queryFn: () => adminStoreApi.getCustomization(),
  });

  const [form, setForm] = useState<Partial<StoreCustomization>>({});

  useEffect(() => {
    if (customization) {
      setForm(customization);
    }
  }, [customization]);

  const mutation = useMutation({
    mutationFn: (data: Partial<StoreCustomization>) =>
      adminStoreApi.updateCustomization(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'customization'] });
      toast.success('Personalização atualizada');
    },
    onError: () => toast.error('Falha ao atualizar personalização'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  function updateField(key: string, value: string | null) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  if (isLoading) {
    return <div className="space-y-4">{[...Array(6)].map((_, i) => <div key={i} className="skeleton h-12" />)}</div>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Palette size={24} className="text-primary" />
        <h1 className="text-2xl font-bold">Personalização Visual</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Colors */}
            <div className="rounded-lg border p-6">
              <h2 className="mb-4 font-semibold">Cores</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {COLOR_FIELDS.map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={(form[key] as string) || '#000000'}
                      onChange={e => updateField(key, e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded border p-0.5"
                    />
                    <div className="flex-1">
                      <label className="block text-sm font-medium">{label}</label>
                      <input
                        type="text"
                        value={(form[key] as string) || ''}
                        onChange={e => updateField(key, e.target.value)}
                        className="input mt-1"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography & Shape */}
            <div className="rounded-lg border p-6">
              <h2 className="mb-4 font-semibold">Tipografia e Forma</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Fonte</label>
                  <Select
                    value={form.font_family || 'Inter'}
                    onChange={v => updateField('font_family', v)}
                    options={[
                      { value: 'Inter', label: 'Inter' },
                      { value: 'Roboto', label: 'Roboto' },
                      { value: 'Open Sans', label: 'Open Sans' },
                      { value: 'Poppins', label: 'Poppins' },
                      { value: 'Lato', label: 'Lato' },
                      { value: 'Montserrat', label: 'Montserrat' },
                      { value: 'Playfair Display', label: 'Playfair Display' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Arredondamento</label>
                  <Select
                    value={form.border_radius || '8px'}
                    onChange={v => updateField('border_radius', v)}
                    options={[
                      { value: '0px', label: 'Quadrado (0px)' },
                      { value: '4px', label: 'Sutil (4px)' },
                      { value: '8px', label: 'Médio (8px)' },
                      { value: '12px', label: 'Grande (12px)' },
                      { value: '16px', label: 'Extra Grande (16px)' },
                      { value: '9999px', label: 'Totalmente Redondo' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Custom CSS */}
            <div className="rounded-lg border p-6">
              <h2 className="mb-4 font-semibold">CSS Personalizado</h2>
              <textarea
                value={form.custom_css || ''}
                onChange={e => updateField('custom_css', e.target.value)}
                className="input min-h-[120px] resize-y font-mono text-xs"
                placeholder="/* Adicione CSS personalizado aqui */"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="sticky top-24 rounded-lg border p-6">
              <h2 className="mb-4 font-semibold">Pré-visualização</h2>
              <div
                className="overflow-hidden rounded-lg border"
                style={{
                  fontFamily: form.font_family || 'Inter',
                  backgroundColor: (form.background_color as string) || '#ffffff',
                  color: (form.text_color as string) || '#1f2937',
                }}
              >
                {/* Mini header */}
                <div className="p-3" style={{ backgroundColor: (form.header_bg_color as string) || '#ffffff' }}>
                  <div className="text-sm font-bold" style={{ color: (form.primary_color as string) || '#6366f1' }}>
                    Sua Loja
                  </div>
                </div>
                {/* Mini content */}
                <div className="p-3 space-y-2">
                  <div
                    className="h-16 rounded flex items-center justify-center text-white text-xs font-medium"
                    style={{
                      backgroundColor: (form.primary_color as string) || '#6366f1',
                      borderRadius: form.border_radius || '8px',
                    }}
                  >
                    Banner
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2].map(i => (
                      <div key={i} className="space-y-1">
                        <div
                          className="h-12 bg-muted"
                          style={{ borderRadius: form.border_radius || '8px' }}
                        />
                        <div className="text-[10px] font-medium">Produto {i}</div>
                        <div
                          className="text-[10px] font-bold"
                          style={{ color: (form.primary_color as string) || '#6366f1' }}
                        >
                          R$29,99
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="w-full py-1.5 text-[10px] font-medium text-white rounded"
                    style={{
                      backgroundColor: (form.primary_color as string) || '#6366f1',
                      borderRadius: form.border_radius || '8px',
                    }}
                  >
                    Adicionar ao Carrinho
                  </button>
                </div>
                {/* Mini footer */}
                <div
                  className="p-3 text-[10px] text-white opacity-75"
                  style={{ backgroundColor: (form.footer_bg_color as string) || '#1f2937' }}
                >
                  Área do Rodapé
                </div>
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn btn-primary btn-lg w-full mt-4 gap-2"
              >
                {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
