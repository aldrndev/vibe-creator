import { Card, CardBody, Slider, Select, SelectItem, Switch, Divider } from '@heroui/react';
import { 
  Settings2, 
  Move, 
  RotateCw, 
  Maximize2, 
  Eye, 
  Volume2, 
  VolumeX,
  Gauge,
  Palette,
  Film
} from 'lucide-react';
import { useEditorStore } from '@/stores/editor-store';
import { clsx } from 'clsx';

// Filter presets
const FILTER_PRESETS = [
  { id: 'none', name: 'None', css: '' },
  { id: 'grayscale', name: 'B&W', css: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(100%)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(50%) contrast(1.1) brightness(0.9)' },
  { id: 'cold', name: 'Cold', css: 'saturate(0.8) hue-rotate(180deg)' },
  { id: 'warm', name: 'Warm', css: 'saturate(1.2) sepia(20%)' },
  { id: 'high-contrast', name: 'High Contrast', css: 'contrast(1.4)' },
  { id: 'fade', name: 'Fade', css: 'contrast(0.9) brightness(1.1) saturate(0.8)' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.5) contrast(1.1)' },
];

// Speed presets
const SPEED_PRESETS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x (Normal)' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

interface InspectorPanelProps {
  className?: string;
}

export function InspectorPanel({ className }: InspectorPanelProps) {
  const { timeline, selectedClipId, updateClip } = useEditorStore();

  // Find selected clip
  let selectedClip = null;
  let selectedTrackId: string | null = null;
  
  for (const track of timeline.tracks) {
    const clip = track.clips.find(c => c.id === selectedClipId);
    if (clip) {
      selectedClip = clip;
      selectedTrackId = track.id;
      break;
    }
  }

  const handleTransformChange = (key: string, value: number) => {
    if (!selectedTrackId || !selectedClipId || !selectedClip) return;
    
    const currentTransforms = selectedClip.transforms || { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
    updateClip(selectedTrackId, selectedClipId, {
      transforms: {
        x: currentTransforms.x,
        y: currentTransforms.y,
        scale: currentTransforms.scale,
        rotation: currentTransforms.rotation,
        opacity: currentTransforms.opacity,
        [key]: value,
      },
    });
  };

  const handleEffectChange = (key: string, value: number | string | string[]) => {
    if (!selectedTrackId || !selectedClipId || !selectedClip) return;
    
    const currentEffects = selectedClip.effects || { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 };
    updateClip(selectedTrackId, selectedClipId, {
      effects: {
        filters: currentEffects.filters,
        speed: currentEffects.speed,
        volume: currentEffects.volume,
        fadeIn: currentEffects.fadeIn,
        fadeOut: currentEffects.fadeOut,
        [key]: value,
      },
    });
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  if (!selectedClip) {
    return (
      <div className={clsx('w-72 bg-content1 border-l border-divider flex flex-col', className)}>
        <div className="p-4 border-b border-divider">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings2 size={18} />
            Inspector
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-foreground/50 text-center">
            Pilih clip di timeline untuk melihat properti
          </p>
        </div>
      </div>
    );
  }

  const transforms = selectedClip.transforms || { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 };
  const effects = selectedClip.effects || { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 };
  const isMuted = effects.volume === 0;
  const currentFilter = effects.filters?.[0] || 'none';

  return (
    <div className={clsx('w-72 bg-content1 border-l border-divider flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-divider shrink-0">
        <h3 className="font-semibold flex items-center gap-2">
          <Settings2 size={18} />
          Inspector
        </h3>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Clip Info */}
        <Card className="bg-content2">
          <CardBody className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-primary/20 flex items-center justify-center">
                <Film size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {selectedClip.asset?.name || 'Untitled Clip'}
                </p>
                <p className="text-xs text-foreground/50">
                  {formatTime(selectedClip.endMs - selectedClip.startMs)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Divider />

        {/* Transform Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Move size={14} />
            Transform
          </h4>

          <div className="space-y-4">
            {/* Position X */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground/60">Position X</span>
                <span>{Math.round(transforms.x)}px</span>
              </div>
              <Slider 
                size="sm"
                minValue={-500}
                maxValue={500}
                step={1}
                value={transforms.x}
                onChange={(v) => handleTransformChange('x', v as number)}
                aria-label="Position X"
              />
            </div>

            {/* Position Y */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground/60">Position Y</span>
                <span>{Math.round(transforms.y)}px</span>
              </div>
              <Slider 
                size="sm"
                minValue={-500}
                maxValue={500}
                step={1}
                value={transforms.y}
                onChange={(v) => handleTransformChange('y', v as number)}
                aria-label="Position Y"
              />
            </div>

            {/* Scale */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground/60 flex items-center gap-1">
                  <Maximize2 size={12} />
                  Scale
                </span>
                <span>{Math.round(transforms.scale * 100)}%</span>
              </div>
              <Slider 
                size="sm"
                minValue={0.1}
                maxValue={3}
                step={0.01}
                value={transforms.scale}
                onChange={(v) => handleTransformChange('scale', v as number)}
                aria-label="Scale"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground/60 flex items-center gap-1">
                  <RotateCw size={12} />
                  Rotation
                </span>
                <span>{Math.round(transforms.rotation)}°</span>
              </div>
              <Slider 
                size="sm"
                minValue={-180}
                maxValue={180}
                step={1}
                value={transforms.rotation}
                onChange={(v) => handleTransformChange('rotation', v as number)}
                aria-label="Rotation"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground/60 flex items-center gap-1">
                  <Eye size={12} />
                  Opacity
                </span>
                <span>{Math.round(transforms.opacity * 100)}%</span>
              </div>
              <Slider 
                size="sm"
                minValue={0}
                maxValue={1}
                step={0.01}
                value={transforms.opacity}
                onChange={(v) => handleTransformChange('opacity', v as number)}
                aria-label="Opacity"
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* Audio Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Volume2 size={14} />
            Audio
          </h4>

          <div className="space-y-4">
            {/* Volume */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-foreground/60 flex items-center gap-1">
                  {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  Volume
                </span>
                <div className="flex items-center gap-2">
                  <span>{isMuted ? 'Muted' : `${Math.round(effects.volume * 100)}%`}</span>
                  <Switch 
                    size="sm"
                    isSelected={!isMuted}
                    onValueChange={(checked) => handleEffectChange('volume', checked ? 1 : 0)}
                    aria-label="Mute toggle"
                  />
                </div>
              </div>
              <Slider 
                size="sm"
                minValue={0}
                maxValue={2}
                step={0.01}
                value={effects.volume}
                onChange={(v) => handleEffectChange('volume', v as number)}
                isDisabled={isMuted}
                aria-label="Volume"
              />
            </div>

            {/* Fade In */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground/60">Fade In</span>
                <span>{effects.fadeIn}ms</span>
              </div>
              <Slider 
                size="sm"
                minValue={0}
                maxValue={2000}
                step={100}
                value={effects.fadeIn}
                onChange={(v) => handleEffectChange('fadeIn', v as number)}
                aria-label="Fade In"
              />
            </div>

            {/* Fade Out */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground/60">Fade Out</span>
                <span>{effects.fadeOut}ms</span>
              </div>
              <Slider 
                size="sm"
                minValue={0}
                maxValue={2000}
                step={100}
                value={effects.fadeOut}
                onChange={(v) => handleEffectChange('fadeOut', v as number)}
                aria-label="Fade Out"
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* Effects Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Palette size={14} />
            Effects
          </h4>

          <div className="space-y-4">
            {/* Speed */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground/60 flex items-center gap-1">
                  <Gauge size={12} />
                  Speed
                </span>
              </div>
              <Select 
                size="sm"
                selectedKeys={[effects.speed.toString()]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  if (selected) handleEffectChange('speed', parseFloat(selected));
                }}
                aria-label="Speed"
              >
                {SPEED_PRESETS.map(preset => (
                  <SelectItem key={preset.value.toString()}>
                    {preset.label}
                  </SelectItem>
                ))}
              </Select>
            </div>

            {/* Filter */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-foreground/60">Filter</span>
              </div>
              <Select 
                size="sm"
                selectedKeys={[currentFilter]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  if (selected) handleEffectChange('filters', selected === 'none' ? [] : [selected]);
                }}
                aria-label="Filter"
              >
                {FILTER_PRESETS.map(preset => (
                  <SelectItem key={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export filter presets for use in VideoPreview
export { FILTER_PRESETS };
