import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
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
  BarChart3,
  Shield,
  Globe,
  ChevronRight,
  Layers,
} from 'lucide-react';

function getStoreUrl(slug: string) {
  const { protocol, host } = window.location;
  return `${protocol}//${slug}.${host}`;
}

const FEATURES = [
  {
    icon: Globe,
    title: 'Multi-tenant',
    description: 'Cada loja com subdomínio próprio, dados isolados e identidade visual única.',
    gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
  },
  {
    icon: Palette,
    title: 'Personalização total',
    description: 'Cores, logotipo e CSS customizado. Sua loja, seu estilo.',
    gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
  },
  {
    icon: Package,
    title: 'Gestão de produtos',
    description: 'Categorias, marcas, imagens múltiplas e controle de estoque.',
    gradient: 'linear-gradient(135deg, #a855f7, #c084fc)',
  },
  {
    icon: Truck,
    title: 'Pedidos & rastreio',
    description: 'Checkout completo, status em tempo real e painel admin.',
    gradient: 'linear-gradient(135deg, #d946ef, #e879f9)',
  },
  {
    icon: BarChart3,
    title: 'Dashboard analytics',
    description: 'Vendas, receita e métricas de performance centralizadas.',
    gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
  },
  {
    icon: Shield,
    title: 'Seguro & confiável',
    description: 'Autenticação JWT, isolamento de dados e sessões protegidas.',
    gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
  },
];

/* ─────────────────────────── Landing CSS ─────────────────────────── */

const landingStyles = `
  @keyframes lp-fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-12px); }
  }
  @keyframes lp-glow {
    0%, 100% { opacity: 0.4; }
    50%      { opacity: 0.8; }
  }
  @keyframes lp-grid-fade {
    from { opacity: 0; }
    to   { opacity: 0.04; }
  }
  .lp-fade-1 { animation: lp-fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.0s both; }
  .lp-fade-2 { animation: lp-fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both; }
  .lp-fade-3 { animation: lp-fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both; }
  .lp-fade-4 { animation: lp-fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both; }
  .lp-fade-5 { animation: lp-fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both; }
  .lp-fade-6 { animation: lp-fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both; }

  @media (prefers-reduced-motion: reduce) {
    .lp-fade-1, .lp-fade-2, .lp-fade-3,
    .lp-fade-4, .lp-fade-5, .lp-fade-6 {
      animation: none;
      opacity: 1;
    }
  }
`;

/* ─────────────────────────── Navbar ──────────────────────────────── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-all"
      style={{
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        backgroundColor: scrolled ? 'rgba(10, 1, 24, 0.8)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        transitionDuration: '300ms',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between" style={{ height: 64 }}>
        <a href="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
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
          <span className="font-bold" style={{ fontSize: 18, color: '#fff', letterSpacing: '-0.01em' }}>
            ProtiStore
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {[
            { label: 'Recursos', href: '#features' },
            { label: 'Lojas', href: '#lojas' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', transitionDuration: '200ms' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#lojas"
            className="text-sm font-semibold rounded-lg cursor-pointer transition-all"
            style={{
              padding: '8px 18px',
              backgroundColor: 'rgba(99,102,241,0.15)',
              color: '#a5b4fc',
              border: '1px solid rgba(99,102,241,0.25)',
              textDecoration: 'none',
              transitionDuration: '200ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.25)';
              e.currentTarget.style.color = '#c7d2fe';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.15)';
              e.currentTarget.style.color = '#a5b4fc';
            }}
          >
            Explorar lojas
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────────── Hero ─────────────────────────────────── */

function HeroSection() {
  return (
    <section
      className="relative flex items-center overflow-hidden"
      style={{ minHeight: '100vh', paddingTop: 64 }}
    >
      {/* Background */}
      <div className="absolute inset-0" style={{ backgroundColor: '#07010f' }}>
        {/* Gradient orbs */}
        <div
          className="absolute"
          style={{
            top: '10%', left: '15%',
            width: 600, height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '5%', right: '10%',
            width: 500, height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            animation: 'lp-grid-fade 1.5s ease-out both',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          {/* Left - Copy */}
          <div style={{ paddingTop: 40, paddingBottom: 40 }}>
            {/* Badge */}
            <div
              className="lp-fade-1 inline-flex items-center gap-2 rounded-full text-xs font-semibold uppercase"
              style={{
                padding: '6px 14px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
                border: '1px solid rgba(99,102,241,0.2)',
                color: '#a5b4fc',
                marginBottom: 28,
                letterSpacing: '0.06em',
              }}
            >
              <Sparkles className="w-3 h-3" />
              Plataforma e-commerce
            </div>

            {/* Headline */}
            <h1
              className="lp-fade-2 font-extrabold"
              style={{
                fontSize: 'clamp(2.25rem, 5.5vw, 4rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.025em',
                color: '#f8fafc',
                marginBottom: 20,
              }}
            >
              Crie sua loja online{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #818cf8, #c084fc, #e879f9)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                em minutos
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="lp-fade-3"
              style={{
                fontSize: 'clamp(1rem, 1.8vw, 1.125rem)',
                lineHeight: 1.7,
                color: 'rgba(203,213,225,0.7)',
                maxWidth: 480,
                marginBottom: 36,
              }}
            >
              Subdomínio exclusivo, personalização completa e painel administrativo
              integrado. Zero código, resultado profissional.
            </p>

            {/* CTAs */}
            <div className="lp-fade-4 flex flex-wrap gap-3">
              <a
                href="#lojas"
                className="group inline-flex items-center gap-2 font-semibold rounded-xl cursor-pointer transition-all"
                style={{
                  padding: '13px 26px',
                  background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                  color: '#fff',
                  fontSize: 15,
                  boxShadow: '0 0 0 1px rgba(99,102,241,0.5), 0 8px 20px rgba(99,102,241,0.2)',
                  textDecoration: 'none',
                  transitionDuration: '200ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.6), 0 12px 28px rgba(99,102,241,0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 8px 20px rgba(99,102,241,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Explorar lojas
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#features"
                className="inline-flex items-center gap-2 font-medium rounded-xl cursor-pointer transition-all"
                style={{
                  padding: '13px 26px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 15,
                  textDecoration: 'none',
                  transitionDuration: '200ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Como funciona
              </a>
            </div>

            {/* Stats */}
            <div
              className="lp-fade-5 flex gap-10"
              style={{ marginTop: 56, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {[
                { value: '100%', label: 'Personalizável' },
                { value: '0', label: 'Código necessário' },
                { value: '< 5min', label: 'Para criar' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-bold" style={{ fontSize: 22, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)', marginTop: 2 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Visual mockup */}
          <div className="lp-fade-6 hidden lg:flex justify-center items-center relative" style={{ perspective: 1200 }}>
            {/* Floating dashboard mockup */}
            <div
              style={{
                width: '100%',
                maxWidth: 520,
                animation: 'lp-float 6s ease-in-out infinite',
              }}
            >
              {/* Browser chrome */}
              <div
                className="rounded-t-2xl"
                style={{
                  padding: '12px 16px',
                  background: 'linear-gradient(180deg, rgba(30,20,50,0.95), rgba(25,15,45,0.95))',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div className="flex gap-1.5">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'rgba(255,95,87,0.8)' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'rgba(255,189,46,0.8)' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'rgba(39,201,63,0.8)' }} />
                </div>
                <div
                  className="flex-1 rounded-md text-center"
                  style={{
                    padding: '4px 12px',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.35)',
                    fontFamily: 'monospace',
                  }}
                >
                  suastore.protistore.com
                </div>
              </div>
              {/* Mockup body */}
              <div
                className="rounded-b-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(180deg, rgba(20,12,40,0.9), rgba(15,8,30,0.95))',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderTop: 'none',
                  padding: 20,
                }}
              >
                {/* Mock header */}
                <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }} />
                    <div style={{ width: 72, height: 10, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)' }} />
                  </div>
                  <div className="flex gap-3">
                    {[40, 48, 36].map((w, i) => (
                      <div key={i} style={{ width: w, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    ))}
                  </div>
                </div>
                {/* Mock hero banner */}
                <div
                  className="rounded-xl"
                  style={{
                    height: 100,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
                    marginBottom: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ width: 120, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                </div>
                {/* Mock product grid */}
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.04)', padding: 10 }}>
                      <div
                        className="rounded-md"
                        style={{
                          height: 56,
                          backgroundColor: `rgba(${99 + i * 20},102,241,0.1)`,
                          marginBottom: 8,
                        }}
                      />
                      <div style={{ height: 6, width: '75%', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 5 }} />
                      <div style={{ height: 6, width: '50%', borderRadius: 3, backgroundColor: 'rgba(139,92,246,0.15)' }} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Glow effect behind */}
              <div
                className="absolute -z-10"
                style={{
                  top: '50%', left: '50%',
                  width: '120%', height: '120%',
                  transform: 'translate(-50%, -50%)',
                  background: 'radial-gradient(ellipse, rgba(99,102,241,0.08) 0%, transparent 70%)',
                  animation: 'lp-glow 4s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────── Features ─────────────────────────────── */

function FeaturesSection() {
  return (
    <section id="features" className="relative" style={{ backgroundColor: '#fafbff', padding: '100px 0 112px' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center" style={{ marginBottom: 56 }}>
          <div
            className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold uppercase"
            style={{
              padding: '5px 14px',
              backgroundColor: '#eef2ff',
              color: '#4f46e5',
              letterSpacing: '0.06em',
              marginBottom: 16,
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            Recursos
          </div>
          <h2
            className="font-extrabold"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              letterSpacing: '-0.025em',
              color: '#0f172a',
              lineHeight: 1.15,
            }}
          >
            Tudo em uma plataforma
          </h2>
          <p style={{ marginTop: 14, fontSize: 17, color: '#64748b', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Ferramentas completas para criar e gerenciar lojas virtuais profissionais.
          </p>
        </div>

        {/* Bento-style feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, idx) => (
            <div
              key={feature.title}
              className="group rounded-2xl cursor-default transition-all"
              style={{
                backgroundColor: '#fff',
                border: '1px solid #f1f5f9',
                padding: 28,
                transitionDuration: '250ms',
                ...(idx === 0 ? { gridRow: 'span 1', gridColumn: 'span 1' } : {}),
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#e0e7ff';
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.06)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#f1f5f9';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl transition-transform"
                style={{
                  width: 44,
                  height: 44,
                  background: feature.gradient,
                  marginBottom: 18,
                  boxShadow: `0 4px 12px ${feature.gradient.includes('#6366f1') ? 'rgba(99,102,241,0.15)' : 'rgba(139,92,246,0.15)'}`,
                }}
              >
                <feature.icon className="w-5 h-5" style={{ color: '#fff' }} />
              </div>
              <h3
                className="font-bold"
                style={{ fontSize: 17, color: '#0f172a', marginBottom: 6, letterSpacing: '-0.01em' }}
              >
                {feature.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: '#64748b' }}>
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
      className="group flex flex-col rounded-2xl cursor-pointer transition-all"
      style={{
        backgroundColor: '#fff',
        border: '1px solid #f1f5f9',
        padding: 24,
        textDecoration: 'none',
        transitionDuration: '250ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#e0e7ff';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.06)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#f1f5f9';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
        {store.logo_url ? (
          <img
            src={store.logo_url}
            alt={store.name}
            className="rounded-xl object-cover"
            style={{ width: 48, height: 48, border: '1px solid #f1f5f9' }}
          />
        ) : (
          <div
            className="rounded-xl flex items-center justify-center font-bold"
            style={{
              width: 48,
              height: 48,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 16,
              boxShadow: '0 4px 12px rgba(99,102,241,0.15)',
            }}
          >
            {initials}
          </div>
        )}
        <ExternalLink
          className="transition-all"
          style={{ width: 15, height: 15, color: '#d1d5db' }}
        />
      </div>

      <h3
        className="font-bold"
        style={{ fontSize: 17, color: '#0f172a', marginBottom: 4, letterSpacing: '-0.01em' }}
      >
        {store.name}
      </h3>
      {store.description && (
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.65,
            color: '#64748b',
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

      <div className="flex items-center justify-between" style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #f8fafc' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>
          {store.slug}.protistore.com
        </span>
        <ChevronRight
          className="transition-transform group-hover:translate-x-0.5"
          style={{ width: 14, height: 14, color: '#c7d2fe' }}
        />
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
    <section id="lojas" style={{ backgroundColor: '#fff', padding: '100px 0 112px' }}>
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center" style={{ marginBottom: 56 }}>
          <div
            className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold uppercase"
            style={{
              padding: '5px 14px',
              backgroundColor: '#f5f3ff',
              color: '#7c3aed',
              letterSpacing: '0.06em',
              marginBottom: 16,
            }}
          >
            <StoreIcon className="w-3.5 h-3.5" />
            Lojas ativas
          </div>
          <h2
            className="font-extrabold"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              letterSpacing: '-0.025em',
              color: '#0f172a',
              lineHeight: 1.15,
            }}
          >
            Conheça quem já vende
          </h2>
          <p style={{ marginTop: 14, fontSize: 17, color: '#64748b', maxWidth: 500, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
            Explore as lojas criadas na plataforma ProtiStore.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl animate-pulse" style={{ backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', padding: 24 }}>
                <div className="rounded-xl" style={{ width: 48, height: 48, backgroundColor: '#e2e8f0', marginBottom: 16 }} />
                <div className="rounded-md" style={{ height: 18, backgroundColor: '#e2e8f0', width: '55%', marginBottom: 10 }} />
                <div className="rounded-md" style={{ height: 14, backgroundColor: '#f1f5f9', width: '100%', marginBottom: 6 }} />
                <div className="rounded-md" style={{ height: 14, backgroundColor: '#f1f5f9', width: '75%' }} />
              </div>
            ))}
          </div>
        ) : stores && stores.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <div className="text-center" style={{ padding: '56px 0' }}>
            <div
              className="mx-auto rounded-2xl flex items-center justify-center"
              style={{ width: 56, height: 56, backgroundColor: '#f8fafc', marginBottom: 16 }}
            >
              <StoreIcon style={{ width: 28, height: 28, color: '#cbd5e1' }} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: 17 }}>Nenhuma loja ativa no momento.</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ──────────────────────── CTA Section ─────────────────────────────── */

function CTASection() {
  return (
    <section style={{ backgroundColor: '#fafbff', padding: '100px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div
          className="relative rounded-3xl overflow-hidden text-center"
          style={{
            padding: 'clamp(48px, 8vw, 80px) clamp(24px, 5vw, 64px)',
            background: 'linear-gradient(135deg, #07010f 0%, #1e0a3e 50%, #0f052a 100%)',
          }}
        >
          {/* Glow */}
          <div
            className="absolute"
            style={{
              top: '-30%', left: '50%', transform: 'translateX(-50%)',
              width: 600, height: 400,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(99,102,241,0.2) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
          <div className="relative z-10">
            <h2
              className="font-extrabold"
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                letterSpacing: '-0.025em',
                color: '#f8fafc',
                marginBottom: 14,
                lineHeight: 1.15,
              }}
            >
              Pronto para começar?
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(203,213,225,0.6)', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', marginBottom: 32, lineHeight: 1.6 }}>
              Monte sua loja virtual em poucos minutos com a plataforma ProtiStore.
            </p>
            <a
              href="#lojas"
              className="inline-flex items-center gap-2 font-semibold rounded-xl cursor-pointer transition-all"
              style={{
                padding: '14px 30px',
                background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                color: '#fff',
                fontSize: 15,
                textDecoration: 'none',
                boxShadow: '0 0 0 1px rgba(99,102,241,0.5), 0 8px 24px rgba(99,102,241,0.25)',
                transitionDuration: '200ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.6), 0 12px 32px rgba(99,102,241,0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 8px 24px rgba(99,102,241,0.25)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Ver lojas ativas
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Footer ──────────────────────────────── */

function Footer() {
  return (
    <footer style={{ backgroundColor: '#07010f', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="max-w-7xl mx-auto px-6" style={{ padding: '40px 24px' }}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className="rounded-lg flex items-center justify-center"
              style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <Sparkles style={{ width: 14, height: 14, color: '#fff' }} />
            </div>
            <span className="font-bold" style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)' }}>
              ProtiStore
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.4)' }}>
            &copy; {new Date().getFullYear()} ProtiStore. Plataforma de e-commerce multi-tenant.
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
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <style>{landingStyles}</style>

      <div style={{ minHeight: '100vh', backgroundColor: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <Navbar />
        <HeroSection />
        <FeaturesSection />
        <StoresSection />
        <CTASection />
        <Footer />
      </div>
    </>
  );
}
