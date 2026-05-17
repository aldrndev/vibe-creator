import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface QuickPresetGridProps {
  readonly children: ReactNode;
  readonly columns?: 'one' | 'two' | 'three';
  readonly label?: string;
}

export function QuickPresetGrid({
  children,
  columns = 'one',
  label,
}: Readonly<QuickPresetGridProps>) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          {label}
        </p>
      )}
      <div
        className={cn(
          'grid gap-2.5',
          columns === 'one' && 'grid-cols-1',
          columns === 'two' && 'grid-cols-1 min-[390px]:grid-cols-2',
          columns === 'three' && 'grid-cols-2 min-[420px]:grid-cols-3',
        )}
      >
        {children}
      </div>
    </div>
  );
}
