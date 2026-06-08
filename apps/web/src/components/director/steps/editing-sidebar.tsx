import { Captions, ScanFace, Scissors, Sparkles, Type, Waves } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { subtitlePresets } from '@/components/director/steps/editing-presets';
import { EditingSubtitleSpeakerControls } from '@/components/director/steps/editing-subtitle-speaker-controls';
import { EditorFontSelect } from '@/components/editor-font-select';
import { Card, CardBody, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import {
  type ContentMode,
  getEffectiveRefineSettings,
  getResolvedContentMode,
} from '@/lib/director-refine-settings';
import { directorSubtitleColorOptions } from '@/lib/director-subtitle-colors';
import { resolveDirectorSubtitleFontFamily } from '@/lib/director-subtitle-fonts';
import {
  clampSubtitleFontSize,
  resolveSubtitleFontSizePreset,
  resolveSubtitleFontSizePresetValue,
  type SubtitleFontSizeContext,
  type SubtitleFontSizePreset,
} from '@/lib/director-subtitle-style';
import { cn } from '@/lib/utils';
import type {
  ExportSettings,
  RefineSettings,
  SelectedClip,
  SubtitleStyle,
} from '@/stores/director-store';

const subtitleAnimationOptions: Array<{
  value: SubtitleStyle['animation'];
  label: string;
  description: string;
}> = [
  { value: 'none', label: 'Static', description: 'Teks tetap stabil.' },
  { value: 'fade', label: 'Fade', description: 'Masuk lembut.' },
  { value: 'typewriter', label: 'Karaoke', description: 'Ikuti ritme ucapan.' },
  { value: 'word', label: 'Word', description: 'Muncul per kata.' },
  { value: 'pop-word', label: 'Pop', description: 'Energi cepat.' },
  { value: 'phrase', label: 'Cinema', description: 'Frasa sinematik.' },
  { value: 'line', label: 'Line', description: 'Baris berganti.' },
];

interface EditingSidebarProps {
  readonly exportSettings: ExportSettings;
  readonly subtitleStyle: SubtitleStyle;
  readonly selectedClips: SelectedClip[];
  readonly refineSettings: Record<string, RefineSettings>;
  readonly onUpdateSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  readonly onUpdateRefineSetting: (
    key: 'faceTracking' | 'removeSilence' | 'optimizeHook' | 'stabilize',
    value: boolean,
  ) => void;
  readonly onApplyContentMode: (mode: RefineSettings['contentMode']) => void;
  readonly isTranscribing: boolean;
}

function normalizePresetSubtitleStyle(style: Partial<SubtitleStyle>): Partial<SubtitleStyle> {
  if (style.speakerMode === 'speaker-colors' || style.stylePreset === 'podcast-duo') {
    return style;
  }

  return {
    ...style,
    speakerMode: 'single',
    speakerStyles: [],
  };
}

export function EditingSidebar({
  exportSettings,
  subtitleStyle,
  selectedClips,
  refineSettings,
  onUpdateSubtitleStyle,
  onUpdateRefineSetting,
  onApplyContentMode,
  isTranscribing,
}: Readonly<EditingSidebarProps>) {
  const primaryClip = selectedClips[0];
  const activeRefineSettings = primaryClip
    ? getEffectiveRefineSettings(primaryClip, refineSettings[primaryClip.id])
    : null;
  const resolvedContentMode = primaryClip
    ? getResolvedContentMode(primaryClip.candidate, refineSettings[primaryClip.id])
    : null;
  const effectiveContentMode = (resolvedContentMode ?? 'auto') as ContentMode;
  const subtitleFontSizeContext: SubtitleFontSizeContext = useMemo(
    () => ({
      mode: effectiveContentMode,
      position: subtitleStyle.position,
      animation: subtitleStyle.animation,
      quality: exportSettings.quality,
      aspectRatio: exportSettings.aspectRatio,
    }),
    [
      effectiveContentMode,
      subtitleStyle.position,
      subtitleStyle.animation,
      exportSettings.quality,
      exportSettings.aspectRatio,
    ],
  );
  useEffect(() => {
    const clampedFontSize = clampSubtitleFontSize(subtitleStyle.fontSize, subtitleFontSizeContext);
    if (clampedFontSize !== subtitleStyle.fontSize) {
      onUpdateSubtitleStyle({ fontSize: clampedFontSize });
    }
  }, [onUpdateSubtitleStyle, subtitleStyle.fontSize, subtitleFontSizeContext]);

  const handleUpdateSubtitleStyle = (style: Partial<SubtitleStyle>) => {
    const nextFontSize = style.fontSize ?? subtitleStyle.fontSize;
    const nextPosition = style.position ?? subtitleStyle.position;
    const nextAnimation = style.animation ?? subtitleStyle.animation;
    const nextFontSizeContext: SubtitleFontSizeContext = {
      mode: effectiveContentMode,
      position: nextPosition,
      animation: nextAnimation,
      quality: exportSettings.quality,
      aspectRatio: exportSettings.aspectRatio,
    };
    const clampedFontSize = clampSubtitleFontSize(nextFontSize, nextFontSizeContext);
    onUpdateSubtitleStyle({
      ...style,
      fontSize: clampedFontSize,
    });
  };

  return (
    <div className="w-full lg:w-[24rem] xl:w-104 shrink-0 self-start pb-6 lg:pb-8">
      <Card className="bg-card/70 border-border/50 backdrop-blur-xl rounded-4xl overflow-hidden">
        <CardBody className="p-4 sm:p-5">
          <Tabs defaultValue="subtitle" className="w-full">
            <TabsList className="h-11 w-full rounded-2xl bg-muted/30 border border-border/40 p-1">
              <TabsTrigger
                value="subtitle"
                className="flex-1 rounded-xl text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  Subtitle
                  {isTranscribing ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  ) : null}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="refine"
                className="flex-1 rounded-xl text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Setting
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subtitle" className="mt-4">
              <SubtitleStyleCard
                subtitleStyle={subtitleStyle}
                onUpdateSubtitleStyle={handleUpdateSubtitleStyle}
                subtitleFontSizeContext={subtitleFontSizeContext}
              />
            </TabsContent>

            <TabsContent value="refine" className="mt-4">
              <RefineCard
                activeRefineSettings={activeRefineSettings}
                onUpdateRefineSetting={onUpdateRefineSetting}
                onApplyContentMode={onApplyContentMode}
              />
            </TabsContent>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  );
}

// ==========================================
// Sub-components to reduce cognitive complexity
// ==========================================

function RefineCard({
  activeRefineSettings,
  onUpdateRefineSetting,
  onApplyContentMode,
}: Readonly<{
  activeRefineSettings: RefineSettings | null;
  onUpdateRefineSetting: (
    key: 'faceTracking' | 'removeSilence' | 'optimizeHook' | 'stabilize',
    value: boolean,
  ) => void;
  onApplyContentMode: (mode: RefineSettings['contentMode']) => void;
}>) {
  if (!activeRefineSettings) {
    return (
      <Card className="bg-transparent border-none shadow-none">
        <CardBody className="p-0">
          <div className="rounded-3xl border border-border/40 bg-muted/20 p-4 text-sm text-muted-foreground">
            Pilih short dulu untuk membuka pengaturan refine.
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardBody className="p-0 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <ScanFace size={19} className="text-primary" />
          </div>
          <div>
            <h4 className="font-black tracking-tight text-lg">Setting Short</h4>
            <p className="text-xs text-muted-foreground">
              Atur framing, tempo, dan stabilitas klip sebelum preview final.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
            Mode Konten
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-muted/30 rounded-2xl p-1.5 border border-border/40">
            {[
              { value: 'auto', label: 'Auto' },
              { value: 'podcast', label: 'Podcast' },
              { value: 'interview', label: 'Dialog' },
              { value: 'product-review', label: 'Product' },
              { value: 'cinematic', label: 'Cinema' },
            ].map((mode) => (
              <button
                type="button"
                key={mode.value}
                onClick={() => onApplyContentMode(mode.value as RefineSettings['contentMode'])}
                className={cn(
                  'px-2 py-1.5 rounded-xl text-[10px] font-black transition-all',
                  activeRefineSettings.contentMode === mode.value
                    ? 'bg-card text-orange-500 border border-orange-500/30'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <RefineToggleRow
            icon={<ScanFace size={14} className="text-primary" />}
            title="Fokus ke Subjek"
            description="Kamera mengikuti subjek utama agar framing tetap pas."
            checked={Boolean(activeRefineSettings.faceTracking)}
            onChange={(checked) => onUpdateRefineSetting('faceTracking', checked)}
          />
          <RefineToggleRow
            icon={<Waves size={14} className="text-primary" />}
            title="Pangkas Jeda"
            description="Potong bagian hening supaya alur video lebih cepat."
            checked={Boolean(activeRefineSettings.removeSilence)}
            onChange={(checked) => onUpdateRefineSetting('removeSilence', checked)}
          />
          <RefineToggleRow
            icon={<Sparkles size={14} className="text-primary" />}
            title="Percepat Opening"
            description="Kurangi filler di awal agar penonton cepat masuk ke inti."
            checked={Boolean(activeRefineSettings.optimizeHook)}
            onChange={(checked) => onUpdateRefineSetting('optimizeHook', checked)}
          />
          <RefineToggleRow
            icon={<Scissors size={14} className="text-primary" />}
            title="Stabilkan Frame"
            description="Buat perpindahan framing lebih halus dan tidak terlihat goyang."
            checked={Boolean(activeRefineSettings.stabilize)}
            onChange={(checked) => onUpdateRefineSetting('stabilize', checked)}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function RefineToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: Readonly<{
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="mt-0.5">{icon}</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onChange} aria-label={title} />
      </div>
    </div>
  );
}

function SubtitleStyleCard({
  subtitleStyle,
  onUpdateSubtitleStyle,
  subtitleFontSizeContext,
}: Readonly<{
  subtitleStyle: SubtitleStyle;
  onUpdateSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  subtitleFontSizeContext: SubtitleFontSizeContext;
}>) {
  const [activePresetId, setActivePresetId] = useState(
    () => subtitleStyle.stylePreset ?? getExactSubtitlePresetId(subtitleStyle) ?? 'viral-pop',
  );
  useEffect(() => {
    if (subtitleStyle.stylePreset && subtitleStyle.stylePreset !== 'custom') {
      setActivePresetId(subtitleStyle.stylePreset);
      return;
    }

    const exactPresetId = getExactSubtitlePresetId(subtitleStyle);
    if (exactPresetId) {
      setActivePresetId(exactPresetId);
    }
  }, [subtitleStyle]);

  const activeFontSizePreset = resolveSubtitleFontSizePreset(
    subtitleStyle.fontSize,
    subtitleFontSizeContext,
  );
  const activeFontFamily = resolveDirectorSubtitleFontFamily(
    subtitleStyle.fontFamily,
    subtitleStyle.fontToken,
  );
  const showSpeakerStyleControls =
    subtitleStyle.speakerMode === 'speaker-colors' || subtitleStyle.stylePreset === 'podcast-duo';
  const sizePresetOptions: Array<{
    value: SubtitleFontSizePreset;
    label: string;
    fontSize: number;
  }> = [
    {
      value: 'small',
      label: 'Kecil',
      fontSize: resolveSubtitleFontSizePresetValue('small', subtitleFontSizeContext),
    },
    {
      value: 'medium',
      label: 'Sedang',
      fontSize: resolveSubtitleFontSizePresetValue('medium', subtitleFontSizeContext),
    },
    {
      value: 'large',
      label: 'Besar',
      fontSize: resolveSubtitleFontSizePresetValue('large', subtitleFontSizeContext),
    },
  ];

  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardBody className="p-0 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <Captions size={20} className="text-orange-500" />
          </div>
          <div>
            <h4 className="font-black tracking-tight text-lg">Gaya Subtitle</h4>
            <p className="text-xs text-muted-foreground">
              Pilih preset, font, warna, dan animasi subtitle.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="ml-1 flex items-center justify-between gap-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Preset Subtitle
            </div>
            <span className="rounded-full border border-border/40 bg-muted/25 px-2.5 py-1 text-[10px] font-black text-muted-foreground">
              {subtitlePresets.length} preset
            </span>
          </div>
          <div className="max-h-78 space-y-2 overflow-y-auto pr-1">
            {subtitlePresets.map((preset) => {
              const isActive = activePresetId === preset.id;

              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => {
                    setActivePresetId(preset.id);
                    onUpdateSubtitleStyle(normalizePresetSubtitleStyle(preset.subtitleStyle));
                  }}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm',
                    isActive
                      ? 'border-orange-500/40 bg-orange-500/10 shadow-[0_0_0_1px_rgba(249,115,22,0.14)]'
                      : 'border-border/40 bg-muted/20 hover:border-orange-500/25 hover:bg-muted/30',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-foreground">{preset.label}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">
                        {preset.description}
                      </div>
                    </div>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1 h-3.5 w-3.5 shrink-0 rounded-full border shadow-sm',
                        getPresetSwatchClass(preset.subtitleStyle.textColorToken),
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center mb-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
              Ukuran Font
            </div>
            <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {subtitleStyle.fontSize}px
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-muted/30 rounded-2xl p-1.5 border border-border/40">
            {sizePresetOptions.map((sizePreset) => (
              <button
                type="button"
                key={sizePreset.value}
                onClick={() =>
                  onUpdateSubtitleStyle({
                    fontSize: sizePreset.fontSize,
                  })
                }
                className={cn(
                  'px-2 py-1.5 rounded-xl text-[10px] font-black transition-all',
                  activeFontSizePreset === sizePreset.value
                    ? 'bg-card text-orange-500 border border-orange-500/30'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {sizePreset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <Type size={12} className="text-muted-foreground/60" />
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Font
            </div>
          </div>
          <EditorFontSelect
            value={activeFontFamily}
            onChange={(fontFamily) => onUpdateSubtitleStyle({ fontFamily })}
          />
        </div>

        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
            Posisi Subtitle
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-muted/30 rounded-2xl p-1.5 border border-border/40">
            {[
              { value: 'top', label: 'Atas' },
              { value: 'center', label: 'Tengah' },
              { value: 'bottom', label: 'Bawah' },
            ].map((pos) => (
              <button
                type="button"
                key={pos.value}
                onClick={() =>
                  onUpdateSubtitleStyle({
                    position: pos.value as typeof subtitleStyle.position,
                  })
                }
                className={cn(
                  'px-2 py-1.5 rounded-xl text-[10px] font-black transition-all',
                  subtitleStyle.position === pos.value
                    ? 'bg-card text-orange-500 border border-orange-500/30'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <Sparkles size={12} className="text-muted-foreground/60" />
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Animasi Subtitle
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {subtitleAnimationOptions.map((animation) => (
              <button
                type="button"
                key={animation.value}
                onClick={() =>
                  onUpdateSubtitleStyle({
                    animation: animation.value as typeof subtitleStyle.animation,
                  })
                }
                className={cn(
                  'flex min-h-15 items-start justify-between gap-2 rounded-2xl border px-2.5 py-2 text-left transition-all',
                  subtitleStyle.animation === animation.value
                    ? 'border-orange-500/35 bg-orange-500/5 text-orange-500'
                    : 'border-border/40 bg-muted/20 text-muted-foreground hover:border-orange-500/25 hover:text-foreground',
                )}
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-black">{animation.label}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold leading-4 text-muted-foreground">
                    {animation.description}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full border',
                    subtitleStyle.animation === animation.value
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-muted-foreground/35',
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block ml-1">
            Warna Teks
          </div>
          <div className="grid grid-cols-4 gap-2">
            {directorSubtitleColorOptions.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() =>
                  onUpdateSubtitleStyle({
                    textColorToken: color.value,
                  })
                }
                className={cn(
                  'rounded-2xl border px-2 py-2 text-[10px] font-bold transition-all',
                  subtitleStyle.textColorToken === color.value
                    ? 'border-orange-500/40 bg-orange-500/10 text-orange-500'
                    : 'border-border/40 bg-muted/20 text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'mx-auto mb-1 block h-4 w-4 rounded-full border',
                    color.swatchClass,
                  )}
                />
                {color.label}
              </button>
            ))}
          </div>
        </div>

        {showSpeakerStyleControls ? (
          <EditingSubtitleSpeakerControls
            subtitleStyle={subtitleStyle}
            onUpdateSubtitleStyle={onUpdateSubtitleStyle}
          />
        ) : null}

        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block ml-1">
            Background Subtitle
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-muted/30 rounded-2xl p-1.5 border border-border/40">
            {(
              [
                { value: 'C_BLACK', label: 'Dark' },
                { value: 'C_WHITE', label: 'Soft Light' },
                { value: 'BG_TRANSPARENT', label: 'Transparent' },
              ] as const
            ).map((background) => (
              <button
                type="button"
                key={background.value}
                onClick={() =>
                  onUpdateSubtitleStyle({
                    bgColorToken: background.value,
                  })
                }
                className={cn(
                  'px-2 py-1.5 rounded-xl text-[10px] font-black transition-all',
                  subtitleStyle.bgColorToken === background.value
                    ? 'bg-card text-orange-500 border border-orange-500/30'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {background.label}
              </button>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function getExactSubtitlePresetId(
  subtitleStyle: SubtitleStyle,
): SubtitleStyle['stylePreset'] | null {
  const matchingPreset = subtitlePresets.find(
    (preset) =>
      subtitleStyle.fontToken === preset.subtitleStyle.fontToken &&
      subtitleStyle.fontFamily === preset.subtitleStyle.fontFamily &&
      subtitleStyle.fontSize === preset.subtitleStyle.fontSize &&
      subtitleStyle.textColorToken === preset.subtitleStyle.textColorToken &&
      subtitleStyle.bgColorToken === preset.subtitleStyle.bgColorToken &&
      subtitleStyle.position === preset.subtitleStyle.position &&
      subtitleStyle.animation === preset.subtitleStyle.animation,
  );

  return matchingPreset?.id ?? null;
}

function getPresetSwatchClass(textColorToken: string | undefined): string {
  switch (textColorToken) {
    case 'C_GREEN':
      return 'border-green-300 bg-green-400';
    case 'C_CYAN':
      return 'border-cyan-200 bg-cyan-300';
    case 'C_BLUE':
      return 'border-blue-300 bg-blue-400';
    case 'C_PINK':
      return 'border-pink-300 bg-pink-400';
    case 'C_ORANGE':
      return 'border-orange-300 bg-orange-400';
    case 'C_YELLOW':
      return 'border-yellow-200 bg-yellow-300';
    default:
      return 'border-zinc-200 bg-white';
  }
}
