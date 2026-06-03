import type { ModernProjectSettings } from '@vibe-creator/shared';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Button, Slider } from '@/components/ui';
import type { EditorAsset } from '@/stores/editor-store';

interface CanvasBackgroundImageControlsProps {
  readonly activeAsset?: EditorAsset;
  readonly notice?: string | null;
  readonly onOpenPicker: () => void;
  readonly onRemove: () => void;
  readonly onUpdateSettings: (settings: Partial<ModernProjectSettings>) => void;
  readonly settings: ModernProjectSettings;
}

export function CanvasBackgroundImageControls({
  activeAsset,
  notice,
  onOpenPicker,
  onRemove,
  onUpdateSettings,
  settings,
}: Readonly<CanvasBackgroundImageControlsProps>) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/30 bg-background/20 p-3">
      {activeAsset ? (
        <div className="overflow-hidden rounded-xl border border-border/35 bg-card/40">
          <img
            src={activeAsset.thumbnailUrl ?? activeAsset.url}
            alt=""
            className="h-24 w-full object-cover"
          />
          <div className="flex items-center justify-between gap-2 p-2">
            <p className="min-w-0 truncate text-xs font-bold text-foreground">{activeAsset.name}</p>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-[10px] font-black uppercase"
                onClick={onOpenPicker}
              >
                Replace
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Remove background image"
                onClick={onRemove}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/45 px-3 py-6 text-muted-foreground transition-colors hover:border-primary/45 hover:text-primary"
          onClick={onOpenPicker}
        >
          <ImagePlus size={20} />
          <span className="text-xs font-black">Choose Background Again</span>
        </button>
      )}

      {notice && (
        <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
          {notice}
        </p>
      )}

      {activeAsset && (
        <>
          <div className="flex gap-2">
            <button
              type="button"
              className={`h-9 flex-1 rounded-lg border text-xs font-bold transition-colors ${
                settings.backgroundImageFit === 'cover'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/40 text-muted-foreground'
              }`}
              onClick={() => onUpdateSettings({ backgroundImageFit: 'cover' })}
            >
              Fill
            </button>
            <button
              type="button"
              className={`h-9 flex-1 rounded-lg border text-xs font-bold transition-colors ${
                settings.backgroundImageFit === 'contain'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/40 text-muted-foreground'
              }`}
              onClick={() => onUpdateSettings({ backgroundImageFit: 'contain' })}
            >
              Fit
            </button>
          </div>

          <ImageControlSlider
            label="Opacity"
            max={1}
            step={0.01}
            value={settings.backgroundOpacity ?? 1}
            displayValue={`${Math.round((settings.backgroundOpacity ?? 1) * 100)}%`}
            onChange={(backgroundOpacity) => onUpdateSettings({ backgroundOpacity })}
          />
          <ImageControlSlider
            label="Blur"
            max={40}
            value={settings.backgroundImageBlurAmount ?? 0}
            onChange={(backgroundImageBlurAmount) =>
              onUpdateSettings({ backgroundImageBlurAmount })
            }
          />
          <ImageControlSlider
            label="Dim"
            max={0.6}
            step={0.01}
            value={settings.backgroundImageDim ?? 0}
            displayValue={`${Math.round((settings.backgroundImageDim ?? 0) * 100)}%`}
            onChange={(backgroundImageDim) => onUpdateSettings({ backgroundImageDim })}
          />
        </>
      )}
    </div>
  );
}

function ImageControlSlider({
  displayValue,
  label,
  max,
  onChange,
  step = 1,
  value,
}: Readonly<{
  displayValue?: string;
  label: string;
  max: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
}>) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          {label}
        </p>
        <span className="text-[10px] font-bold text-muted-foreground">
          {displayValue ?? Math.round(value).toString()}
        </span>
      </div>
      <Slider
        min={0}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(nextValue: number[]) => onChange(nextValue[0] ?? value)}
      />
    </div>
  );
}
