import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { aboutHighlights, landingProductFeatures, landingWorkflows } from '@/data/landing-content';
import { useDocumentMetadata } from '@/hooks/use-document-metadata';
import { PublicPageLayout } from './PublicPageLayout';

export function AboutPage() {
  useDocumentMetadata({
    title: 'Tentang Kami - Vibe Creator',
    description:
      'Pelajari lebih lanjut tentang Vibe Creator, platform workspace all-in-one bertenaga AI untuk memudahkan alur kerja kreator konten harian.',
  });

  return (
    <PublicPageLayout
      eyebrow="About"
      title="Vibe Creator adalah workspace video untuk workflow creator modern."
      description="Kami membangun satu tempat untuk menemukan ide, membuat short, mengedit video, memperpanjang loop ambience, merekam reaction, dan menyiarkan video ke platform tujuan."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {aboutHighlights.map((item) => (
          <div key={item.title} className="rounded-2xl border border-border/70 bg-card/70 p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
              <item.icon size={21} />
            </div>
            <h2 className="text-lg font-black">{item.title}</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-12 rounded-3xl border border-border/70 bg-card/60 p-6 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
              Fitur utama
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Tool yang saling menyambung dari ide sampai publish.
            </h2>
          </div>
          <Button asChild className="h-11 rounded-xl font-bold">
            <Link to="/register">
              Mulai Gratis
              <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {landingProductFeatures.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border/60 bg-background/45 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon size={18} />
                </div>
                <div>
                  <h3 className="font-black">{feature.title}</h3>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-4 lg:grid-cols-4">
        {landingWorkflows.map((step, index) => (
          <div key={step.label} className="rounded-2xl border border-border/70 bg-card/70 p-5">
            <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
              {index + 1}
            </div>
            <h3 className="font-black">{step.label}</h3>
            <p className="mt-2 text-sm font-medium leading-relaxed text-muted-foreground">
              {step.description}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-12 rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Download size={20} />
            </div>
            <h2 className="text-2xl font-black">Dibuat untuk creator yang ingin bergerak cepat.</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground">
              Vibe Creator masih terus dikembangkan sebelum launch penuh. Fokus kami sederhana:
              workflow video yang practical, aman, dan bisa dipakai berulang setiap hari.
            </p>
          </div>
          <div className="grid gap-2 text-sm font-semibold text-muted-foreground">
            {['Dark-first interface', 'Project history', 'Export/download lifecycle'].map(
              (item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check size={15} className="text-primary" />
                  {item}
                </div>
              ),
            )}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
