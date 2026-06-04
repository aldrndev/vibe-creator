import { Link } from '@tanstack/react-router';
import { Sparkles } from 'lucide-react';
import { landingFooterGroups } from '@/data/landing-content';
import { useAuthStore } from '@/stores/auth-store';

type LandingSectionId = 'features' | 'workflow' | 'pricing';

interface LandingFooterProps {
  readonly onSectionClick: (sectionId: LandingSectionId) => void;
}

export function LandingFooter({ onSectionClick }: LandingFooterProps) {
  const { isAuthenticated } = useAuthStore();

  return (
    <footer className="border-t border-border/60 bg-background py-10">
      <div className="container mx-auto grid gap-8 px-4 sm:px-6 lg:grid-cols-[1.2fr_2fr_auto]">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 font-black">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles size={17} />
            </div>
            Vibe Creator
          </Link>
          <p className="mt-3 max-w-xs text-sm font-medium leading-relaxed text-muted-foreground">
            Workspace video creator untuk short, editing, loop, reaction, dan live streaming.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {landingFooterGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-foreground">
                {group.title}
              </h2>
              <div className="mt-3 grid gap-2 text-sm font-semibold text-muted-foreground">
                {group.links.map((link) =>
                  'section' in link ? (
                    <button
                      key={link.label}
                      type="button"
                      onClick={() => onSectionClick(link.section)}
                      className="w-fit transition-colors hover:text-primary"
                    >
                      {link.label}
                    </button>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.to}
                      className="w-fit transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid content-start gap-2 text-sm font-semibold text-muted-foreground">
          {isAuthenticated ? (
            <Link to="/dashboard" className="transition-colors hover:text-primary">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="transition-colors hover:text-primary">
                Masuk
              </Link>
              <Link to="/register" className="transition-colors hover:text-primary">
                Daftar
              </Link>
            </>
          )}
          <p className="pt-3 text-xs font-medium text-muted-foreground/80">© 2026 Vibe Creator.</p>
        </div>
      </div>
    </footer>
  );
}
