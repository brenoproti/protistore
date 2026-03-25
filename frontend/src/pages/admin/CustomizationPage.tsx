import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Palette, ShoppingCart, Search } from 'lucide-react';
import { adminStoreApi } from '@/lib/api';
import type { StoreCustomization } from '@/types';
import { toast } from 'sonner';

function isDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

const COLOR_FIELDS: { key: keyof StoreCustomization; label: string }[] = [
  { key: 'primary_color', label: 'Cor Primária' },
  { key: 'accent_color', label: 'Cor de Destaque' },
  { key: 'header_bg_color', label: 'Fundo do Cabeçalho' },
  { key: 'footer_bg_color', label: 'Fundo do Rodapé' },
];

function PreviewMiniStore({ form }: { form: Partial<StoreCustomization> }) {
  const primary = (form.primary_color as string) || '#6366f1';
  const accent = (form.accent_color as string) || '#f59e0b';
  const bg = '#ffffff';
  const text = '#1f2937';
  const headerBg = (form.header_bg_color as string) || '#ffffff';
  const footerBg = (form.footer_bg_color as string) || '#1f2937';
  const radius = '8px';

  const headerText = isDark(headerBg) ? '#ffffff' : '#1f2937';
  const footerText = isDark(footerBg) ? '#ffffff' : '#1f2937';
  const btnText = isDark(primary) ? '#ffffff' : '#1f2937';

  return (
    <div
      className="overflow-hidden rounded-lg border shadow-sm"
      style={{ fontSize: 10, lineHeight: 1.4 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: headerBg, color: headerText, borderBottom: '1px solid rgba(0,0,0,0.08)' }}
      >
        <span className="font-bold" style={{ fontSize: 11 }}>Sua Loja</span>
        <div className="flex items-center gap-2">
          <Search size={10} style={{ opacity: 0.5 }} />
          <div className="relative">
            <ShoppingCart size={11} />
            <span
              className="absolute -top-1.5 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-bold"
              style={{ backgroundColor: primary, color: btnText }}
            >
              2
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ backgroundColor: bg, color: text }}>
        {/* Banner */}
        <div
          className="flex items-center justify-center"
          style={{ height: 44, backgroundColor: primary, color: btnText }}
        >
          <span className="font-bold" style={{ fontSize: 11 }}>Novidades da temporada</span>
        </div>

        {/* Products */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold" style={{ fontSize: 10 }}>Destaques</span>
            <span style={{ color: primary, fontSize: 8 }}>Ver todos →</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{ name: 'Produto A', badge: true }, { name: 'Produto B', badge: false }].map(p => (
              <div key={p.name} className="overflow-hidden" style={{ borderRadius: radius, border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="relative" style={{ height: 36, backgroundColor: `${primary}10` }}>
                  {p.badge && (
                    <span
                      className="absolute top-1 left-1 px-1 rounded font-bold"
                      style={{ fontSize: 7, backgroundColor: accent, color: isDark(accent) ? '#fff' : '#1f2937' }}
                    >
                      OFERTA
                    </span>
                  )}
                </div>
                <div className="p-1.5">
                  <div className="font-medium" style={{ fontSize: 9 }}>{p.name}</div>
                  <div className="font-bold" style={{ color: primary, fontSize: 10 }}>R$ 99,90</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Button */}
        <div className="px-3 py-3">
          <div
            className="flex items-center justify-center font-bold"
            style={{ backgroundColor: primary, color: btnText, borderRadius: radius, padding: '5px 0', fontSize: 10 }}
          >
            Comprar Agora
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-3 py-2"
        style={{ backgroundColor: footerBg, color: footerText }}
      >
        <div className="font-bold" style={{ fontSize: 9 }}>Sua Loja</div>
        <div style={{ opacity: 0.4, fontSize: 7, marginTop: 2 }}>© 2026 Todos os direitos reservados.</div>
      </div>
    </div>
  );
}

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


          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="sticky top-24 rounded-lg border p-6">
              <h2 className="mb-4 font-semibold">Pré-visualização</h2>
              <PreviewMiniStore form={form} />

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
