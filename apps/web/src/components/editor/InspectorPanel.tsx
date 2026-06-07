import { Film, Settings2, Unlink, Volume2 } from 'lucide-react';
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Switch,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { type EditorClip, type EditorTimeline, useEditorStore } from '@/stores/editor-store';

// Filter presets
const FILTER_PRESETS = [
  { id: 'none', name: 'None', css: '' },
  { id: 'grayscale', name: 'B&W', css: 'grayscale(100%)' },
  { id: 'sepia', name: 'Sepia', css: 'sepia(100%)' },
  {
    id: 'vintage',
    name: 'Vintage',
    css: 'sepia(50%) contrast(1.1) brightness(0.9)',
  },
  { id: 'cold', name: 'Cold', css: 'saturate(0.8) hue-rotate(180deg)' },
  { id: 'warm', name: 'Warm', css: 'saturate(1.2) sepia(20%)' },
  { id: 'high-contrast', name: 'High Contrast', css: 'contrast(1.4)' },
  {
    id: 'fade',
    name: 'Fade',
    css: 'contrast(0.9) brightness(1.1) saturate(0.8)',
  },
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

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}

// Find selected clip and its track type
function getSelectedClipInfo(timeline: EditorTimeline, selectedClipId: string | null) {
  for (const track of timeline.tracks) {
    const clip = track.clips.find((c) => c.id === selectedClipId);
    if (clip) {
      return {
        selectedClip: clip,
        selectedTrackId: track.id,
        selectedTrackType: track.type,
      };
    }
  }
  return { selectedClip: null, selectedTrackId: null, selectedTrackType: null };
}

function TransformSection({
  transforms,
  onChange,
}: {
  transforms: EditorClip['transforms'];
  onChange: (key: string, value: number) => void;
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Transform
      </h4>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Position X</span>
              <span className="font-mono text-[10px] text-muted-foreground/70">
                {Math.round(transforms.x)}
              </span>
            </div>
            <Slider
              min={-1000}
              max={1000}
              value={[transforms.x ?? 0]}
              onValueChange={(v) => onChange('x', v[0] ?? 0)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Position Y</span>
              <span className="font-mono text-[10px] text-muted-foreground/70">
                {Math.round(transforms.y)}
              </span>
            </div>
            <Slider
              min={-1000}
              max={1000}
              value={[transforms.y ?? 0]}
              onValueChange={(v) => onChange('y', v[0] ?? 0)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Scale</span>
              <span className="font-mono text-[10px] text-muted-foreground/70">
                {Math.round(transforms.scale * 100)}%
              </span>
            </div>
            <Slider
              min={0.1}
              max={5}
              step={0.01}
              value={[transforms.scale ?? 1]}
              onValueChange={(v) => onChange('scale', v[0] ?? 1)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Rotation</span>
              <span className="font-mono text-[10px] text-muted-foreground/70">
                {Math.round(transforms.rotation)}°
              </span>
            </div>
            <Slider
              min={-180}
              max={180}
              value={[transforms.rotation ?? 0]}
              onValueChange={(v) => onChange('rotation', v[0] ?? 0)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Opacity</span>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {Math.round(transforms.opacity * 100)}%
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[transforms.opacity ?? 1]}
            onValueChange={(v) => onChange('opacity', v[0] ?? 1)}
          />
        </div>
      </div>
    </div>
  );
}

function AudioSection({
  effects,
  isMuted,
  onChange,
}: {
  effects: EditorClip['effects'];
  isMuted: boolean;
  onChange: (key: string, value: number) => void;
}) {
  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Audio
        </h4>
        <Switch
          checked={!isMuted}
          onCheckedChange={(checked) => onChange('volume', checked ? 1 : 0)}
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Volume</span>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {isMuted ? 'Muted' : `${Math.round(effects.volume * 100)}%`}
            </span>
          </div>
          <Slider
            min={0}
            max={2}
            step={0.01}
            value={[effects.volume ?? 1]}
            onValueChange={(v) => onChange('volume', v[0] ?? 1)}
            disabled={isMuted}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Fade In (ms)</span>
            <input
              type="number"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={effects.fadeIn}
              onChange={(e) => onChange('fadeIn', Number.parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Fade Out (ms)</span>
            <input
              type="number"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={effects.fadeOut}
              onChange={(e) => onChange('fadeOut', Number.parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EffectsSection({
  effects,
  currentFilter,
  selectedTrackType,
  onChange,
}: {
  effects: EditorClip['effects'];
  currentFilter: string;
  selectedTrackType: string | null;
  onChange: (key: string, value: number | string | string[]) => void;
}) {
  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Effects
      </h4>

      <div className="space-y-4">
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Speed</span>
          <Select
            value={effects.speed.toString()}
            onValueChange={(v) => onChange('speed', Number.parseFloat(v))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEED_PRESETS.map((preset) => (
                <SelectItem key={preset.value.toString()} value={preset.value.toString()}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTrackType !== 'AUDIO' && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Filter</span>
            <Select
              value={currentFilter}
              onValueChange={(v) => onChange('filters', v === 'none' ? [] : [v])}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_PRESETS.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

export function InspectorPanel({ className }: InspectorPanelProps) {
  const { timeline, selectedClipId, updateClip, detachLinkedClips } = useEditorStore();

  const { selectedClip, selectedTrackId, selectedTrackType } = getSelectedClipInfo(
    timeline,
    selectedClipId,
  );

  const handleTransformChange = (key: string, value: number) => {
    if (!selectedTrackId || !selectedClipId || !selectedClip) return;

    const currentTransforms = selectedClip.transforms || {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
    };
    updateClip(selectedTrackId, selectedClipId, {
      transforms: {
        ...currentTransforms,
        [key]: value,
      },
    });
  };

  const handleEffectChange = (key: string, value: number | string | string[]) => {
    if (!selectedTrackId || !selectedClipId || !selectedClip) return;

    const currentEffects = selectedClip.effects || {
      filters: [],
      speed: 1,
      volume: 1,
      fadeIn: 0,
      fadeOut: 0,
    };
    updateClip(selectedTrackId, selectedClipId, {
      effects: {
        ...currentEffects,
        [key]: value,
      },
    });
  };

  if (!selectedClip) {
    return (
      <div
        className={cn(
          'w-full md:w-80 bg-background border-l border-border flex flex-col pt-12 text-center text-muted-foreground',
          className,
        )}
      >
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings2 size={20} className="opacity-50" />
        </div>
        <p className="text-sm font-medium">No Selection</p>
        <p className="text-xs opacity-60 mt-1">Select a clip to edit properties</p>
      </div>
    );
  }

  const transforms = selectedClip.transforms || {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
  };
  const effects = selectedClip.effects || {
    filters: [],
    speed: 1,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
  };
  const isMuted = effects.volume === 0;
  const currentFilter = effects.filters?.[0] || 'none';

  return (
    <div
      className={cn(
        'w-full md:w-80 bg-background border-l border-border flex flex-col overflow-hidden',
        className,
      )}
    >
      {/* Header */}
      <div className="h-14 md:h-16 px-6 border-b border-border flex items-center shrink-0">
        <h3 className="font-semibold text-sm">Inspector</h3>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Clip Info */}
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              selectedTrackType === 'AUDIO'
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-blue-500/10 text-blue-500',
            )}
          >
            {selectedTrackType === 'AUDIO' ? <Volume2 size={20} /> : <Film size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {selectedClip.asset?.name || 'Untitled Clip'}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {selectedTrackType === 'AUDIO' ? 'AUDIO' : 'VIDEO'}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {formatTime(selectedClip.endMs - selectedClip.startMs)}
              </span>
            </div>

            {/* Detach button for linked clips */}
            {selectedClip.linkId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] mt-2 text-muted-foreground hover:text-foreground -ml-2"
                onClick={() => {
                  if (selectedClipId) {
                    detachLinkedClips(selectedClipId);
                  }
                }}
              >
                <Unlink size={12} className="mr-1.5" />
                Unlink Audio
              </Button>
            )}
          </div>
        </div>

        {/* Transform Section - VIDEO ONLY */}
        {selectedTrackType !== 'AUDIO' && (
          <TransformSection transforms={transforms} onChange={handleTransformChange} />
        )}

        {/* Audio Section */}
        <AudioSection effects={effects} isMuted={isMuted} onChange={handleEffectChange} />

        {/* Effects Section */}
        <EffectsSection
          effects={effects}
          currentFilter={currentFilter}
          selectedTrackType={selectedTrackType}
          onChange={handleEffectChange}
        />
      </div>
    </div>
  );
}

export { FILTER_PRESETS };
