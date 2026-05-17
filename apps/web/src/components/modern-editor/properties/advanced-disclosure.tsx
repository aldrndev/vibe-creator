import { SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdvancedDisclosureProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly title?: string;
}

export function AdvancedDisclosure({
  children,
  className,
  title = 'Advanced',
}: Readonly<AdvancedDisclosureProps>) {
  return (
    <details
      className={cn('group rounded-2xl border border-border/30 bg-background/20 p-3.5', className)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black uppercase tracking-widest text-muted-foreground">
        {title}
        <SlidersHorizontal size={15} className="transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}
