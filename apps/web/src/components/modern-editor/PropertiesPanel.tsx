/**
 * Properties Panel
 *
 * Context-aware property editor based on selected layer.
 * Shows transform, timing, and type-specific properties.
 */

import type { Layer } from '@vibe-creator/shared';
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { useModernEditorStore } from '@/stores/modern-editor-store';
import { AudioLayerProperties } from './properties/audio-layer-properties';
import { ImageLayerProperties } from './properties/image-layer-properties';
import { parseFiniteNumber } from './properties/property-number';
import { TextLayerProperties } from './properties/text-layer-properties';
import { VideoLayerProperties } from './properties/video-layer-properties';

interface PropertiesPanelProps {
  className?: string;
}

export function PropertiesPanel({ className }: Readonly<PropertiesPanelProps>) {
  const { selectedLayerId, layersById, updateLayer, getMaxEndMs, settings, updateSettings } =
    useModernEditorStore();

  const selectedLayer = selectedLayerId ? layersById[selectedLayerId] : null;

  const aspectRatioOptions = [
    { label: '16:9 (Landscape)', width: 1920, height: 1080 },
    { label: '9:16 (Portrait)', width: 1080, height: 1920 },
    { label: '1:1 (Square)', width: 1080, height: 1080 },
    { label: '4:5 (IG Portrait)', width: 1080, height: 1350 },
    { label: 'Custom', width: 0, height: 0 },
  ];

  const handleAspectRatioChange = (value: string) => {
    const selected = aspectRatioOptions.find((opt) => opt.label === value);
    if (selected && selected.width > 0) {
      updateSettings({ width: selected.width, height: selected.height });
    }
  };

  const getCurrentAspectRatio = () => {
    const found = aspectRatioOptions.find(
      (opt) => opt.width === settings.width && opt.height === settings.height,
    );
    return found?.label || 'Custom';
  };

  if (!selectedLayer) {
    return (
      <div className={cn('space-y-6', className)}>
        <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
          <CardBody className="p-6 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                Canvas Settings
              </h3>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Aspect Ratio
              </div>
              <Select value={getCurrentAspectRatio()} onValueChange={handleAspectRatioChange}>
                <SelectTrigger className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight">
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  {aspectRatioOptions.map((opt) => (
                    <SelectItem
                      key={opt.label}
                      value={opt.label}
                      className="text-xs font-bold uppercase"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Width
                </div>
                <Input
                  type="number"
                  value={settings.width.toString()}
                  className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    updateSettings({ width: parseFiniteNumber(e.target.value, settings.width) });
                  }}
                />
              </div>
              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Height
                </div>
                <Input
                  type="number"
                  value={settings.height.toString()}
                  className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    updateSettings({ height: parseFiniteNumber(e.target.value, settings.height) });
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Frame Rate
              </div>
              <Select
                value={settings.fps.toString()}
                onValueChange={(value) =>
                  updateSettings({ fps: Number(value) as typeof settings.fps })
                }
              >
                <SelectTrigger className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[24, 30, 60].map((fps) => (
                    <SelectItem key={fps} value={fps.toString()} className="text-xs font-bold">
                      {fps} FPS
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Background Color
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-3 bg-background/30 p-1.5 rounded-xl border border-border/20 flex-1 group">
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                    className="w-10 h-8 rounded-lg cursor-pointer bg-transparent border-none appearance-none"
                  />
                  <Input
                    value={settings.backgroundColor}
                    className="bg-transparent border-none focus:ring-0 h-8 font-mono font-bold text-xs group-hover:text-primary transition-colors"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateSettings({ backgroundColor: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-card/50 border-dashed border-border/40">
          <CardBody className="p-8 text-center text-muted-foreground">
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">
              Pilih layer untuk edit properti
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<Layer>) => {
    if (!selectedLayerId) {
      return;
    }

    updateLayer(selectedLayerId, updates);
  };

  const maxDuration = Math.max(getMaxEndMs(), 60000);

  return (
    <div
      className={cn(
        'space-y-6 h-full overflow-y-auto pr-1 scrollbar-hide pb-20 md:pb-0',
        className,
      )}
    >
      {/* Transform Properties */}
      <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
        <CardBody className="p-6 space-y-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Transform
          </h3>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Position X ({selectedLayer.x}%)
              </div>
              <Slider
                min={0}
                max={100}
                value={[selectedLayer.x]}
                onValueChange={(v: number[]) => handleUpdate({ x: v[0] })}
              />
            </div>
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Position Y ({selectedLayer.y}%)
              </div>
              <Slider
                min={0}
                max={100}
                value={[selectedLayer.y]}
                onValueChange={(v: number[]) => handleUpdate({ y: v[0] })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Width ({selectedLayer.width}%)
              </div>
              <Slider
                min={1}
                max={200}
                value={[selectedLayer.width]}
                onValueChange={(v: number[]) => handleUpdate({ width: v[0] })}
              />
            </div>
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Height ({selectedLayer.height}%)
              </div>
              <Slider
                min={1}
                max={200}
                value={[selectedLayer.height]}
                onValueChange={(v: number[]) => handleUpdate({ height: v[0] })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Rotation (°)
              </div>
              <Slider
                min={-180}
                max={180}
                value={[selectedLayer.rotation]}
                onValueChange={(v: number[]) => handleUpdate({ rotation: v[0] })}
              />
            </div>
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Opacity ({Math.round(selectedLayer.opacity * 100)}%)
              </div>
              <Slider
                min={0}
                max={1}
                step={0.05}
                value={[selectedLayer.opacity]}
                onValueChange={(v: number[]) => handleUpdate({ opacity: v[0] })}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Timing Properties */}
      <Card className="bg-card/70 backdrop-blur-xl border-border/40 overflow-hidden">
        <CardBody className="p-6 space-y-8">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Timing Control
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Start (s)
              </div>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={(selectedLayer.startMs / 1000).toFixed(1)}
                className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight text-center"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleUpdate({
                    startMs: parseFiniteNumber(e.target.value, selectedLayer.startMs / 1000) * 1000,
                  });
                }}
              />
            </div>
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                End (s)
              </div>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={(selectedLayer.endMs / 1000).toFixed(1)}
                className="bg-background/40 border-border/40 h-11 rounded-xl font-bold text-xs uppercase tracking-tight text-center"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleUpdate({
                    endMs: parseFiniteNumber(e.target.value, selectedLayer.endMs / 1000) * 1000,
                  });
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Timeline Position
            </div>
            <Slider
              min={0}
              max={maxDuration}
              value={[selectedLayer.startMs, selectedLayer.endMs]}
              onValueChange={(v: number[]) => {
                if (v.length === 2) {
                  handleUpdate({ startMs: v[0], endMs: v[1] });
                }
              }}
            />
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-muted-foreground/40">
                Durasi: {((selectedLayer.endMs - selectedLayer.startMs) / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Type-specific Properties */}
      {selectedLayer.type === 'text' && (
        <TextLayerProperties layer={selectedLayer} onUpdate={handleUpdate} />
      )}
      {selectedLayer.type === 'image' && (
        <ImageLayerProperties layer={selectedLayer} onUpdate={handleUpdate} />
      )}
      {selectedLayer.type === 'video' && (
        <VideoLayerProperties layer={selectedLayer} onUpdate={handleUpdate} />
      )}
      {selectedLayer.type === 'audio' && (
        <AudioLayerProperties layer={selectedLayer} onUpdate={handleUpdate} />
      )}
    </div>
  );
}
