import { Link } from '@tanstack/react-router';
import { ArrowLeft, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui';

interface PublicPageLayoutProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

export function PublicPageLayout({ eyebrow, title, description, children }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/95">
        <div className="container mx-auto flex h-[72px] items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-black">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="bg-linear-to-r from-primary via-orange-500 to-rose-600 bg-clip-text text-lg text-transparent">
              Vibe Creator
            </span>
          </Link>
          <Button asChild variant="outline" className="h-10 rounded-xl">
            <Link to="/">
              <ArrowLeft size={16} />
              Kembali
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </p>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-muted-foreground">
            {description}
          </p>
          <div className="mt-10">{children}</div>
        </div>
      </main>
    </div>
  );
}
