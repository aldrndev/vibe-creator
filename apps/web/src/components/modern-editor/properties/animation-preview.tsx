import type { EditorAnimationPreset } from '@/lib/modern-editor-animation-catalog';
import { cn } from '@/lib/utils';

interface AnimationPreviewProps {
  readonly preset: EditorAnimationPreset;
  readonly text?: string;
}

export function AnimationPreview({ preset, text = 'Aa' }: Readonly<AnimationPreviewProps>) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-primary/20">
      <span
        key={preset.id}
        className={cn(
          'rounded-lg bg-black/35 px-3 py-2 text-center text-base font-black leading-none text-white shadow-xl',
          preset.previewClassName,
          preset.payload && 'will-change-transform',
        )}
      >
        {text}
      </span>
    </div>
  );
}
