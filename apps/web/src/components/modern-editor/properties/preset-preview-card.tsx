import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PresetPreviewCardProps {
  readonly active?: boolean;
  readonly children?: ReactNode;
  readonly helper?: string;
  readonly label: string;
  readonly onClick: () => void;
  readonly previewClassName?: string;
  readonly sample?: string;
}

export function PresetPreviewCard({
  active = false,
  children,
  helper,
  label,
  onClick,
  previewClassName,
  sample,
}: Readonly<PresetPreviewCardProps>) {
  return (
    <button
      type="button"
      className={cn(
        'group overflow-hidden rounded-2xl border bg-background/25 p-2 text-left transition-all active:scale-[0.99]',
        active
          ? 'border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]'
          : 'border-border/35 hover:border-primary/45 hover:bg-primary/5',
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'relative flex min-h-20 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-muted/25',
          previewClassName,
        )}
      >
        {children ?? (
          <span className="max-w-[88%] text-center text-lg font-black leading-none text-white drop-shadow">
            {sample ?? label}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-foreground">{label}</p>
          {helper && (
            <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-snug text-muted-foreground/75">
              {helper}
            </p>
          )}
        </div>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all',
            active
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border/30 bg-muted/20 text-muted-foreground group-hover:border-primary/45 group-hover:text-primary',
          )}
        >
          <Plus size={16} />
        </span>
      </div>
    </button>
  );
}
