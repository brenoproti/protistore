import { useQuery } from '@tanstack/react-query';
import { platformApi } from '@/lib/api';
import type { Store } from '@/types';
import {
  Store as StoreIcon,
  Palette,
  Package,
  Truck,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Zap,
} from 'lucide-react';

function getStoreUrl(slug: string) {
  const { protocol, host } = window.location;
  return `${protocol}//${slug}.${host}`;
}

const FEATURES = [
  {
    icon: StoreIcon,
    title: 'Multi-tenant',
    description:
      'Cada loja opera de forma independente com subdomínio próprio, dados isolados e identidade visual única.',
    color: '#818cf8',
    bg: '#818cf820',
  },
  {
    icon: Palette,
    title: 'Personalização total',
    description:
      'Cores, tipografia, logotipo e CSS customizado. Sua loja, seu estilo — sem limitações.',
    color: '#a78bfa',
    bg: '#a78bfa20',
  },
  {
    icon: Package,
    title: 'Gestão de produtos',
    description:
      'Categorias, marcas, variações de preço, imagens múltiplas e controle completo de estoque.',
    color: '#c084fc',
    bg: '#c084fc20',
  },
  {
    icon: Truck,
    title: 'Pedidos & rastreio',
    description:
      'Fluxo completo de checkout, acompanhamento de status e painel administrativo em tempo real.',
    color: '#e879f9',
    bg: '#e879f920',
  },
];

/* ─────────────────────────── Landing CSS ─────────────────────────── */

const landingStyles = `
  @keyframes lp-fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes lp-spin-slow-reverse {
    from { transform: rotate(45deg); }
    to   { transform: rotate(-315deg); }
  }
  @keyframes lp-pulse-soft {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 1; }
  }
  .lp-fade-1 { animation: lp-fadeUp 0.7s ease-out 0.0s both; }
  .lp-fade-2 { animation: lp-fadeUp 0.7s ease-out 0.1s both; }
  .lp-fade-3 { animation: lp-fadeUp 0.7s ease-out 0.2s both; }
  .lp-fade-4 { animation: lp-fadeUp 0.7s ease-out 0.35s both; }
  .lp-fade-5 { animation: lp-fadeUp 0.7s ease-out 0.5s both; }
`;

/* ─────────────────────────── Hero ─────────────────────────────────── */

function HeroSection() {
  return (
    <section
      className="relative flex items-center overflow-hidden"
      style={{ minHeight: '92vh' }}
    >
      {/* Dark background */}
      <div className="absolute inset-0" style={{ backgroundColor: '#0a0118' }}>
        {/* Gradient mesh */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.4,
            background:
              'radial-gradient(ellipse 80% 60% at 20% 40%, #4338ca 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 20%, #7c3aed 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 60% 80%, #6d28d9 0%, transparent 50%)',
          }}
        />
        {/* Grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.06,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        {/* Decorative shapes */}
        <div
          className="absolute rounded-full"
          style={{
            top: '15%',
            right: '10%',
            width: 288,
            height: 288,
            border: '1px solid rgba(99,102,241,0.2)',
            animation: 'lp-spin-slow 40s linear infinite',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '20%',
            left: '5%',
            width: 192,
            height: 192,
            border: '1px solid rgba(139,92,246,0.15)',
            animation: 'lp-spin-slow-reverse 60s linear infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '60%',
            right: '25%',
            width: 12,
            height: 12,
            backgroundColor: 'rgba(129,140,248,0.6)',
            animation: 'lp-pulse-soft 3s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '30%',
            left: '40%',
            width: 8,
            height: 8,
            backgroundColor: 'rgba(167,139,250,0.4)',
            animation: 'lp-pulse-soft 3s ease-in-out infinite 1s',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-20" style={{ fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <div style={{ maxWidth: 720 }}>
          {/* Badge */}
          <div
            className="lp-fade-1 inline-flex items-center gap-2 rounded-full text-sm font-medium"
            style={{
              padding: '6px 16px',
              border: '1px solid rgba(99,102,241,0.3)',
              backgroundColor: 'rgba(99,102,241,0.1)',
              color: '#a5b4fc',
              marginBottom: 32,
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Plataforma e-commerce multi-tenant
          </div>

          {/* Headline */}
          <h1
            className="lp-fade-2 font-extrabold"
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: '#fff',
              marginBottom: 24,
            }}
          >
            Sua loja online.
            <br />
            <span
              style={{
                background: 'linear-gradient(to right, #818cf8, #a78bfa, #e879f9)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Pronta em minutos.
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="lp-fade-3"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              lineHeight: 1.7,
              color: 'rgba(165,180,252,0.7)',
              maxWidth: 540,
              marginBottom: 40,
            }}
          >
            Crie, personalize e gerencie sua loja virtual com subdomínio
            exclusivo. Sem código, sem complicações — apenas vendas.
          </p>

          {/* CTA */}
          <div className="lp-fade-4 flex flex-wrap gap-4">
            <a
              href="#lojas"
              className="group inline-flex items-center gap-2.5 font-semibold rounded-xl"
              style={{
                padding: '14px 28px',
                backgroundColor: '#6366f1',
                color: '#fff',
                boxShadow: '0 8px 24px rgba(99,102,241,0.25)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#818cf8';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6366f1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Ver lojas ativas
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center gap-2 font-medium rounded-xl"
              style={{
                padding: '14px 28px',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.8)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
              }}
            >
              Saiba mais
            </a>
          </div>
        </div>

        {/* Stats bar */}
        <div
          className="lp-fade-5 grid grid-cols-3 gap-8"
          style={{ marginTop: 80, paddingTop: 40, borderTop: '1px solid rgba(255,255,255,0.1)', maxWidth: 420 }}
        >
          {[
            { value: '100%', label: 'Personalizável' },
            { value: '0', label: 'Linhas de código' },
            { value: '∞', label: 'Possibilidades' },
          ].map((stat) => (
            <div key={stat.label}>
              <div
                className="font-bold"
                style={{
                  fontFamily: "'Sora', system-ui, sans-serif",
                  fontSize: 'clamp(1.25rem, 2.5vw, 1.875rem)',
                  color: '#fff',
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: 14, color: 'rgba(165,180,252,0.4)', marginTop: 4 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Features ─────────────────────────────── */

function FeaturesSection() {
  return (
    <section id="features" className="relative overflow-hidden" style={{ backgroundColor: '#fafaff', padding: '112px 0' }}>
      {/* Top gradient transition from hero */}
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: 128, background: 'linear-gradient(to bottom, #0a0118, transparent)' }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center" style={{ marginBottom: 64 }}>
          <div
            className="inline-flex items-center gap-2 font-semibold uppercase"
            style={{ fontSize: 14, letterSpacing: '0.05em', color: '#4f46e5', marginBottom: 16 }}
          >
            <Zap className="w-4 h-4" />
            Recursos
          </div>
          <h2
            className="font-extrabold"
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 3rem)',
              letterSpacing: '-0.02em',
              color: '#111827',
            }}
          >
            Tudo que você precisa
          </h2>
          <p
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              marginTop: 16,
              fontSize: 18,
              color: '#6b7280',
              maxWidth: 540,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Uma plataforma completa para criar e gerenciar lojas virtuais profissionais.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl"
              style={{
                backgroundColor: '#fff',
                border: '1px solid #f3f4f6',
                padding: 28,
                transition: 'all 0.3s',
                cursor: 'default',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#c7d2fe';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(99,102,241,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#f3f4f6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: feature.bg,
                  color: feature.color,
                  marginBottom: 20,
                }}
              >
                <feature.icon className="w-6 h-6" />
              </div>
              <h3
                className="font-bold"
                style={{
                  fontFamily: "'Sora', system-ui, sans-serif",
                  fontSize: 18,
                  color: '#111827',
                  marginBottom: 8,
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  fontFamily: "'Outfit', system-ui, sans-serif",
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: '#6b7280',
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────── Store Card ──────────────────────────────── */

function StoreCard({ store }: { store: Store }) {
  const url = getStoreUrl(store.slug);
  const initials = store.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col rounded-2xl"
      style={{
        backgroundColor: '#fff',
        border: '1px solid #f3f4f6',
        padding: 24,
        textDecoration: 'none',
        transition: 'all 0.3s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#c7d2fe';
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(99,102,241,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#f3f4f6';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
        {store.logo_url ? (
          <img
            src={store.logo_url}
            alt={store.name}
            className="rounded-xl object-cover"
            style={{ width: 56, height: 56, border: '1px solid #f3f4f6' }}
          />
        ) : (
          <div
            className="rounded-xl flex items-center justify-center font-bold"
            style={{
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(99,102,241,0.2)',
            }}
          >
            {initials}
          </div>
        )}
        <ExternalLink style={{ width: 16, height: 16, color: '#d1d5db', transition: 'color 0.2s' }} />
      </div>

      <h3
        className="font-bold"
        style={{
          fontFamily: "'Sora', system-ui, sans-serif",
          fontSize: 18,
          color: '#111827',
          marginBottom: 4,
        }}
      >
        {store.name}
      </h3>
      {store.description && (
        <p
          style={{
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontSize: 14,
            lineHeight: 1.7,
            color: '#6b7280',
            marginBottom: 16,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {store.description}
        </p>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #f9fafb' }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: 'rgba(99,102,241,0.6)',
          }}
        >
          {store.slug}.vibestore.com
        </span>
      </div>
    </a>
  );
}

/* ────────────────────── Stores Section ────────────────────────────── */

function StoresSection() {
  const { data: stores, isLoading } = useQuery<Store[]>({
    queryKey: ['platform-stores'],
    queryFn: () => platformApi.listStores(),
  });

  return (
    <section id="lojas" style={{ backgroundColor: '#fff', padding: '112px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center" style={{ marginBottom: 64 }}>
          <div
            className="inline-flex items-center gap-2 font-semibold uppercase"
            style={{ fontSize: 14, letterSpacing: '0.05em', color: '#7c3aed', marginBottom: 16 }}
          >
            <StoreIcon className="w-4 h-4" />
            Lojas Ativas
          </div>
          <h2
            className="font-extrabold"
            style={{
              fontFamily: "'Sora', system-ui, sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 3rem)',
              letterSpacing: '-0.02em',
              color: '#111827',
            }}
          >
            Conheça quem já vende
          </h2>
          <p
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              marginTop: 16,
              fontSize: 18,
              color: '#6b7280',
              maxWidth: 540,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Explore as lojas criadas na plataforma VibeStore.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl animate-pulse" style={{ backgroundColor: '#f9fafb', padding: 24 }}>
                <div className="rounded-xl" style={{ width: 56, height: 56, backgroundColor: '#e5e7eb', marginBottom: 16 }} />
                <div className="rounded" style={{ height: 20, backgroundColor: '#e5e7eb', width: '66%', marginBottom: 12 }} />
                <div className="rounded" style={{ height: 16, backgroundColor: '#f3f4f6', width: '100%', marginBottom: 8 }} />
                <div className="rounded" style={{ height: 16, backgroundColor: '#f3f4f6', width: '80%' }} />
              </div>
            ))}
          </div>
        ) : stores && stores.length > 0 ? (
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <div className="text-center" style={{ padding: '64px 0' }}>
            <div
              className="mx-auto rounded-2xl flex items-center justify-center"
              style={{ width: 64, height: 64, backgroundColor: '#f9fafb', marginBottom: 16 }}
            >
              <StoreIcon style={{ width: 32, height: 32, color: '#d1d5db' }} />
            </div>
            <p style={{ color: '#9ca3af', fontSize: 18 }}>Nenhuma loja ativa no momento.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────── Footer ──────────────────────────────── */

function Footer() {
  return (
    <footer style={{ backgroundColor: '#0a0118', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="max-w-7xl mx-auto px-6" style={{ padding: '48px 24px' }}>
        <div className="flex flex-col items-center justify-between gap-4" style={{ flexDirection: undefined }}>
          <div className="flex items-center gap-3">
            <div
              className="rounded-lg flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              }}
            >
              <Sparkles style={{ width: 16, height: 16, color: '#fff' }} />
            </div>
            <span
              className="font-bold"
              style={{ fontFamily: "'Sora', system-ui, sans-serif", fontSize: 18, color: '#fff' }}
            >
              VibeStore
            </span>
          </div>
          <p
            style={{
              fontFamily: "'Outfit', system-ui, sans-serif",
              fontSize: 14,
              color: 'rgba(165,180,252,0.35)',
              marginTop: 8,
            }}
          >
            &copy; {new Date().getFullYear()} VibeStore. Plataforma de e-commerce multi-tenant.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────── Main Component ──────────────────────────── */

export function LandingPage() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&family=Sora:wght@700;800&display=swap"
        rel="stylesheet"
      />
      <style>{landingStyles}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#fff', fontFamily: "'Outfit', system-ui, sans-serif" }}>
        <HeroSection />
        <FeaturesSection />
        <StoresSection />
        <Footer />
      </div>
    </>
  );
}
