import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Download, Menu, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingProductPreview } from '@/components/landing/product-preview';
import { Button } from '@/components/ui';
import {
  landingPricingPlans,
  landingProductFeatures,
  landingWorkflows,
} from '@/data/landing-content';
import { useDocumentMetadata } from '@/hooks/use-document-metadata';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

type LandingSectionId = 'features' | 'workflow' | 'pricing';

const landingNavItems: ReadonlyArray<{ label: string; section: LandingSectionId }> = [
  { label: 'Fitur', section: 'features' },
  { label: 'Workflow', section: 'workflow' },
  { label: 'Harga', section: 'pricing' },
];

function scrollToSection(sectionId: LandingSectionId) {
  globalThis.document
    .getElementById(sectionId)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function LandingPage() {
  useDocumentMetadata({
    title: 'Vibe Creator - All-in-One AI Video & Content Workspace',
    description:
      'Bikin konten video lebih cepat dari satu workspace. Mulai dari trending, buat short, edit timeline, loop ambience, record reaction, export, dan live stream.',
  });

  const { isAuthenticated } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const primaryCta = isAuthenticated
    ? { label: 'Buka Dashboard', to: '/dashboard' as const }
    : { label: 'Mulai Gratis', to: '/register' as const };
  const pricingCta = isAuthenticated ? '/dashboard/pricing' : '/register';

  const handleSectionClick = (sectionId: LandingSectionId) => {
    scrollToSection(sectionId);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const updateScrollState = () => setHasScrolled(globalThis.scrollY > 8);
    updateScrollState();
    globalThis.addEventListener('scroll', updateScrollState, { passive: true });

    return () => globalThis.removeEventListener('scroll', updateScrollState);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/25">
      <header
        className={cn(
          'sticky top-0 z-50 bg-background/88 backdrop-blur-xl transition-colors',
          hasScrolled && 'border-b border-border/60',
        )}
      >
        <div className="container mx-auto flex h-18 items-center justify-between px-4 sm:px-6">
          <Link
            to="/"
            className="group flex items-center gap-2 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="bg-linear-to-r from-primary via-orange-500 to-rose-600 bg-clip-text text-lg font-black tracking-tight text-transparent">
              Vibe Creator
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {landingNavItems.map((item) => (
              <button
                key={item.section}
                type="button"
                onClick={() => handleSectionClick(item.section)}
                className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {!isAuthenticated && (
              <Button variant="ghost" asChild className="hidden rounded-full sm:inline-flex">
                <Link to="/login">Masuk</Link>
              </Button>
            )}
            <Button asChild className="hidden rounded-full px-5 font-bold sm:inline-flex">
              <Link to={primaryCta.to}>{primaryCta.label}</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full lg:hidden"
              onClick={() => setIsMenuOpen((value) => !value)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </Button>
          </div>
        </div>

        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 right-0 top-18 z-50 border-b border-border bg-background p-4 shadow-2xl lg:hidden"
          >
            <nav className="grid gap-2">
              {landingNavItems.map((item) => (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => handleSectionClick(item.section)}
                  className="rounded-xl px-3 py-3 text-left text-sm font-bold text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="mt-4 grid gap-3 border-t border-border pt-4">
              {!isAuthenticated && (
                <Button variant="outline" asChild className="rounded-xl">
                  <Link to="/login">Masuk</Link>
                </Button>
              )}
              <Button asChild className="rounded-xl font-bold">
                <Link to={primaryCta.to}>{primaryCta.label}</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </header>

      <main>
        <section className="container mx-auto px-4 pb-14 pt-14 sm:px-6 sm:pt-20 min-h-screen">
          <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="max-w-3xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                <Sparkles size={14} />
                AI Video Workspace
              </div>
              <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Bikin konten video lebih cepat dari satu workspace.
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-muted-foreground sm:text-lg">
                Mulai dari trending atau source video. Buat short, edit timeline, loop ambience,
                record reaction, export, download, atau live stream tanpa pindah tool.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-xl px-6 font-bold">
                  <Link to={primaryCta.to}>
                    {primaryCta.label}
                    <ArrowRight size={18} />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl px-6 font-bold"
                  onClick={() => handleSectionClick('features')}
                >
                  Lihat Fitur
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
            >
              <LandingProductPreview />
            </motion.div>
          </div>
        </section>

        <section id="features" className="border-y border-border/60 bg-card/30 py-16 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Fitur utama
              </p>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Tool dari ide sampai siap upload.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {landingProductFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border/70 bg-background/70 p-5 transition-colors hover:border-primary/35 hover:bg-primary/5"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                    <feature.icon size={21} />
                  </div>
                  <h3 className="text-lg font-black text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="container mx-auto px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Workflow
            </p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Alur kerja yang jelas, bukan tool terpisah yang membingungkan.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            {landingWorkflows.map((step, index) => (
              <div key={step.label} className="rounded-2xl border border-border/70 bg-card p-5">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                  {index + 1}
                </div>
                <h3 className="text-lg font-black text-foreground">{step.label}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="border-y border-border/60 bg-card/30 py-16 sm:py-20">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="mb-10 flex flex-col gap-3 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Harga</p>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                Paket sesuai tahap produksi.
              </h2>
              <p className="mx-auto max-w-2xl text-sm font-medium text-muted-foreground sm:text-base">
                Mulai gratis, lalu upgrade saat kamu butuh export lebih banyak, resolusi lebih
                tinggi, dan workflow premium.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {landingPricingPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    'relative flex flex-col rounded-2xl border bg-background/75 p-6',
                    plan.popular
                      ? 'border-primary/50 shadow-lg shadow-primary/10'
                      : 'border-border/70',
                  )}
                >
                  {plan.popular && (
                    <span className="mb-4 w-fit rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-wide text-primary-foreground">
                      Paling populer
                    </span>
                  )}
                  <h3 className="text-2xl font-black text-foreground">{plan.name}</h3>
                  <p className="mt-2 min-h-11 text-sm font-medium leading-relaxed text-muted-foreground">
                    {plan.description}
                  </p>
                  <div className="mt-6 flex items-end gap-2">
                    <span className="text-4xl font-black tracking-tight">{plan.price}</span>
                    <span className="pb-1 text-sm font-semibold text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm font-semibold">
                        <Check size={16} className="mt-0.5 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    variant={plan.popular ? 'default' : 'outline'}
                    className="mt-8 h-11 rounded-xl font-bold"
                  >
                    <Link to={pricingCta}>
                      {isAuthenticated ? 'Kelola Plan' : plan.cta}
                      <ArrowRight size={16} />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16 sm:px-6 sm:py-20">
          <div className="rounded-3xl border border-primary/35 bg-background/75 p-6 text-center shadow-lg shadow-primary/10 sm:p-10">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
              <Download size={22} />
            </div>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              Siapkan workflow creator kamu hari ini.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
              Coba AI Director, Video Studio, Loop Creator, Reaction Recorder, dan Live Streaming
              dari satu akun.
            </p>
            <Button asChild size="lg" className="mt-7 h-12 rounded-xl px-7 font-black">
              <Link to={primaryCta.to}>
                {primaryCta.label}
                <ArrowRight size={18} />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <LandingFooter onSectionClick={handleSectionClick} />
    </div>
  );
}
