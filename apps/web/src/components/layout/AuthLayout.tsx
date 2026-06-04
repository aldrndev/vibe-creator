import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  readonly children: ReactNode;
}

const authHighlights = [
  {
    label: 'Mulai dari ide atau source video',
    description: 'Pakai Trending, AI Director, atau upload video sendiri.',
  },
  {
    label: 'Produksi dalam satu workspace',
    description: 'Edit, loop, reaction, live stream, export, dan download.',
  },
  {
    label: 'Draft dan riwayat tetap rapi',
    description: 'Lanjutkan project aktif tanpa mulai ulang dari awal.',
  },
] as const;

const authFeatureChips = ['AI Director', 'Video Studio', 'Loop', 'Reaction', 'Live'] as const;

export function AuthLayout(props: AuthLayoutProps) {
  const { children } = props;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Left side - Brand Section */}
      <div className="relative hidden overflow-hidden border-r border-border/60 bg-card/70 lg:flex lg:w-[40%] lg:shrink-0">
        <div className="relative z-10 flex min-h-screen w-full flex-col p-10 xl:p-12">
          <Link
            to="/"
            className="group flex items-center gap-2 text-2xl font-black tracking-tighter transition-opacity hover:opacity-90"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary via-orange-500 to-rose-600 transition-transform group-hover:scale-105">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="bg-linear-to-r from-primary via-orange-500 to-rose-600 bg-clip-text text-transparent">
              Vibe Creator
            </span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-14 max-w-md space-y-7 xl:mt-16"
          >
            <div className="space-y-4">
              <h1 className="text-4xl font-black leading-tight tracking-tight xl:text-5xl">
                Workspace video creator kamu.
              </h1>
              <p className="text-base font-medium leading-relaxed text-muted-foreground xl:text-lg">
                Lanjutkan short, edit timeline, buat loop, record reaction, atau kelola live stream
                dari satu akun.
              </p>
            </div>

            <div className="rounded-3xl border border-border/70 bg-background/45 p-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                Workflow siap pakai
              </p>
              <div className="mt-4 grid gap-4">
                {authHighlights.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-bold leading-snug text-foreground">{item.label}</p>
                      <p className="text-sm font-medium leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {authFeatureChips.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border/70 bg-background/40 px-3 py-1.5 text-xs font-bold text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>

          <p className="mt-auto pt-10 text-sm font-medium text-muted-foreground">
            © 2026 Vibe Creator. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side - Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-background/50 backdrop-blur-sm relative overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo - Visible only on smaller screens */}
          <div className="lg:hidden mb-8 flex flex-col items-center text-center">
            <Link
              to="/"
              className="flex items-center gap-2 text-3xl font-black tracking-tighter mb-2 group transition-opacity"
            >
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-primary via-orange-500 to-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Sparkles className="text-white w-7 h-7" />
              </div>
              <span className="bg-clip-text text-transparent bg-linear-to-r from-primary via-orange-500 to-rose-600">
                Vibe Creator
              </span>
            </Link>
            <p className="text-muted-foreground font-medium text-sm">
              Video workspace for creators.
            </p>
          </div>

          <div className="bg-card/30 lg:bg-transparent border border-border/50 lg:border-none p-6 sm:p-0 rounded-3xl backdrop-blur-md lg:backdrop-blur-none shadow-xl lg:shadow-none">
            {children}
          </div>
        </motion.div>

        {/* Mobile Footer Credit */}
        <div className="lg:hidden mt-12">
          <p className="text-muted-foreground/60 text-xs font-medium">© 2026 Vibe Creator.</p>
        </div>
      </div>
    </div>
  );
}
