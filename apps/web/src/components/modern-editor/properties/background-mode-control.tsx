import type { CanvasBackgroundMode } from '@vibe-creator/shared';
import { Blend, Droplets, Image as ImageIcon, Palette } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const modes: readonly {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: CanvasBackgroundMode;
}[] = [
  { value: 'solid', label: 'Color', icon: <Palette size={14} /> },
  { value: 'gradient', label: 'Gradient', icon: <Blend size={14} /> },
  { value: 'image', label: 'Image', icon: <ImageIcon size={14} /> },
  { value: 'blur', label: 'Blur Content', icon: <Droplets size={14} /> },
];

interface BackgroundModeControlProps {
  readonly onChange: (mode: CanvasBackgroundMode) => void;
  readonly value: CanvasBackgroundMode;
}

export function BackgroundModeControl({ onChange, value }: Readonly<BackgroundModeControlProps>) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/35 bg-background/25 p-1">
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          aria-pressed={value === mode.value}
          className={cn(
            'flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-bold transition-colors',
            value === mode.value
              ? 'bg-primary/12 text-primary'
              : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
          )}
          onClick={() => onChange(mode.value)}
        >
          {mode.icon}
          {mode.label}
        </button>
      ))}
    </div>
  );
}
