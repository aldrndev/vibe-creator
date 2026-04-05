import { Captions, Download, MapPin } from 'lucide-react';
import { EditingLivePreview } from '@/components/director/steps/editing-live-preview';
import { platformPresets, subtitlePresets } from '@/components/director/steps/editing-presets';
import { Button, Card, CardBody, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { cn } from '@/lib/utils';
import type {
  DirectorSession,
  ExportSettings,
  RefineSettings,
  SelectedClip,
  SubtitleStyle,
} from '@/stores/director-store';

interface EditingSidebarProps {
  readonly activeSession: DirectorSession | null;
  readonly exportSettings: ExportSettings;
  readonly subtitleStyle: SubtitleStyle;
  readonly selectedClips: SelectedClip[];
  readonly refineSettings: Record<string, RefineSettings>;
  readonly onUpdateExportSettings: (settings: Partial<ExportSettings>) => void;
  readonly onUpdateSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  readonly onProceedToPublishCopy: () => void;
}

export function EditingSidebar({
  activeSession,
  exportSettings,
  subtitleStyle,
  selectedClips,
  refineSettings,
  onUpdateExportSettings,
  onUpdateSubtitleStyle,
  onProceedToPublishCopy,
}: Readonly<EditingSidebarProps>) {
  return (
    <div className="w-full lg:w-[24rem] xl:w-104 shrink-0 self-start pb-6 lg:sticky lg:top-24 lg:pb-8">
      <Card className="bg-card/70 border-border/50 backdrop-blur-xl rounded-4xl overflow-hidden">
        <CardBody className="p-4 sm:p-5">
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="h-11 w-full rounded-2xl bg-muted/30 border border-border/40 p-1">
              <TabsTrigger
                value="preview"
                className="flex-1 rounded-xl text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary"
              >
                Preview
              </TabsTrigger>
              <TabsTrigger
                value="subtitle"
                className="flex-1 rounded-xl text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-orange-500"
              >
                Subtitle
              </TabsTrigger>
              <TabsTrigger
                value="export"
                className="flex-1 rounded-xl text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-card data-[state=active]:text-primary"
              >
                Ekspor
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <EditingLivePreview
                activeSession={activeSession}
                exportSettings={exportSettings}
                subtitleStyle={subtitleStyle}
                selectedClips={selectedClips}
                refineSettings={refineSettings}
              />
            </TabsContent>

            <TabsContent value="subtitle" className="mt-4">
              <SubtitleStyleCard
                subtitleStyle={subtitleStyle}
                onUpdateSubtitleStyle={onUpdateSubtitleStyle}
              />
            </TabsContent>

            <TabsContent value="export" className="mt-4">
              <ExportSettingsCard
                exportSettings={exportSettings}
                subtitleStyle={subtitleStyle}
                onUpdateExportSettings={onUpdateExportSettings}
                onUpdateSubtitleStyle={onUpdateSubtitleStyle}
                onProceedToPublishCopy={onProceedToPublishCopy}
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

function ExportSettingsCard({
  exportSettings,
  subtitleStyle,
  onUpdateExportSettings,
  onUpdateSubtitleStyle,
  onProceedToPublishCopy,
}: Readonly<{
  exportSettings: ExportSettings;
  subtitleStyle: SubtitleStyle;
  onUpdateExportSettings: (settings: Partial<ExportSettings>) => void;
  onUpdateSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  onProceedToPublishCopy: () => void;
}>) {
  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardBody className="p-0 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Download size={20} className="text-primary" />
          </div>
          <h4 className="font-black tracking-tight text-lg">Ekspor</h4>
        </div>

        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block ml-1">
            Preset Platform
          </div>
          <div className="space-y-2">
            {platformPresets.map((preset) => {
              const isActive =
                exportSettings.aspectRatio === preset.exportSettings.aspectRatio &&
                subtitleStyle.position === preset.subtitleStyle.position &&
                subtitleStyle.fontSize === preset.subtitleStyle.fontSize;

              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => {
                    onUpdateExportSettings(preset.exportSettings);
                    onUpdateSubtitleStyle(preset.subtitleStyle);
                  }}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-3 text-left transition-all',
                    isActive
                      ? 'border-primary/30 bg-primary/10'
                      : 'border-border/40 bg-muted/20 hover:border-primary/20',
                  )}
                >
                  <div className="text-sm font-black text-foreground">{preset.label}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block ml-1">
            Kualitas
          </div>
          <div className="flex bg-muted/30 rounded-2xl p-1.5 border border-border/40">
            {['720p', '1080p'].map((quality) => (
              <button
                type="button"
                key={quality}
                onClick={() =>
                  onUpdateExportSettings({
                    quality: quality as '720p' | '1080p',
                  })
                }
                className={cn(
                  'flex-1 px-4 py-2 rounded-xl text-xs font-black transition-all',
                  exportSettings.quality === quality
                    ? 'bg-card text-primary border border-border/50'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {quality}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block ml-1">
            Rasio Aspek
          </div>
          <div className="flex bg-muted/30 rounded-2xl p-1.5 border border-border/40">
            {['9:16', '16:9', '1:1'].map((ratio) => (
              <button
                type="button"
                key={ratio}
                onClick={() =>
                  onUpdateExportSettings({
                    aspectRatio: ratio as '9:16' | '16:9' | '1:1',
                  })
                }
                className={cn(
                  'flex-1 px-4 py-2 rounded-xl text-xs font-black transition-all',
                  exportSettings.aspectRatio === ratio
                    ? 'bg-card text-primary border border-border/50'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Audio Lebih Rata
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Normalisasi volume otomatis supaya hasil Shorts terasa lebih stabil.
              </p>
            </div>
            <button
              type="button"
              aria-pressed={exportSettings.normalizeAudio}
              onClick={() =>
                onUpdateExportSettings({
                  normalizeAudio: !exportSettings.normalizeAudio,
                })
              }
              className={cn(
                'min-w-24 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition-all',
                exportSettings.normalizeAudio
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'bg-card text-muted-foreground border border-border/50',
              )}
            >
              {exportSettings.normalizeAudio ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>
        </div>

        <Button
          className="w-full rounded-2xl h-14 font-black uppercase tracking-widest text-[11px] relative overflow-hidden group/btn"
          onClick={onProceedToPublishCopy}
        >
          <span className="relative z-10">Lanjut ke Copy Publish</span>
          <div className="absolute inset-0 bg-linear-to-r from-primary via-orange-500 to-rose-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
        </Button>
      </CardBody>
    </Card>
  );
}

function SubtitleStyleCard({
  subtitleStyle,
  onUpdateSubtitleStyle,
}: Readonly<{
  subtitleStyle: SubtitleStyle;
  onUpdateSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
}>) {
  return (
    <Card className="bg-transparent border-none shadow-none">
      <CardBody className="p-0 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <Captions size={20} className="text-orange-500" />
          </div>
          <h4 className="font-black tracking-tight text-lg">Gaya Teks</h4>
        </div>

        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block ml-1">
            Preset Subtitle
          </div>
          <div className="space-y-2">
            {subtitlePresets.map((preset) => {
              const isActive =
                subtitleStyle.fontToken === preset.subtitleStyle.fontToken &&
                subtitleStyle.position === preset.subtitleStyle.position &&
                subtitleStyle.animation === preset.subtitleStyle.animation &&
                subtitleStyle.fontSize === preset.subtitleStyle.fontSize;

              return (
                <button
                  type="button"
                  key={preset.id}
                  onClick={() => onUpdateSubtitleStyle(preset.subtitleStyle)}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-3 text-left transition-all',
                    isActive
                      ? 'border-orange-500/30 bg-orange-500/10'
                      : 'border-border/40 bg-muted/20 hover:border-orange-500/20',
                  )}
                >
                  <div className="text-sm font-black text-foreground">{preset.label}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">
              Ukuran Font
            </div>
            <span className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              {subtitleStyle.fontSize}px
            </span>
          </div>
          <input
            type="range"
            min="16"
            max="48"
            value={subtitleStyle.fontSize}
            onChange={(event) =>
              onUpdateSubtitleStyle({
                fontSize: Number.parseInt(event.target.value, 10),
              })
            }
            className="w-full accent-primary h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 ml-1">
            <MapPin size={12} className="text-muted-foreground/60" />
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
              Posisi Subtitle
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 bg-muted/30 rounded-2xl p-1.5 border border-border/40">
            {[
              { value: 'top', label: 'Atas' },
              { value: 'center', label: 'Tengah' },
              { value: 'bottom', label: 'Bawah' },
              { value: 'cinema-bottom', label: 'Cinema' },
              { value: 'safe-bottom', label: 'Safe' },
              { value: 'lower-third', label: 'Lower ⅓' },
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
      </CardBody>
    </Card>
  );
}
