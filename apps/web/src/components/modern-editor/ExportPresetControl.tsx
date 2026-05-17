import { Monitor, Smartphone, Square } from 'lucide-react';
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui';
import { videoStudioCanvasPresets } from '@/lib/modern-editor-quick-actions';
import { cn } from '@/lib/utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';

export function ExportPresetControl() {
  const settings = useModernEditorStore((state) => state.settings);
  const updateSettings = useModernEditorStore((state) => state.updateSettings);

  return (
    <div className="hidden items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 md:flex">
      {videoStudioCanvasPresets.map((preset) => {
        const isActive = settings.width === preset.width && settings.height === preset.height;
        const Icon =
          preset.id === 'landscape' ? Monitor : preset.id === 'square' ? Square : Smartphone;

        return (
          <Tooltip key={preset.id}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={preset.label}
                className={cn(
                  'h-9 w-9 rounded-xl transition-all',
                  isActive
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => updateSettings({ width: preset.width, height: preset.height })}
              >
                <Icon size={17} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{preset.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
