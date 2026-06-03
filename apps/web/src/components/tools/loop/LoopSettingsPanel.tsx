import { Film, Info, Settings2, VolumeX } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Switch } from '@/components/ui';
import { cn } from '@/lib/utils';
import type {
  LoopCreatorProjectDocument,
  LoopSourceInfo,
} from '@/services/loop-creator-project-api';

interface LoopSettingsPanelProps {
  readonly document: LoopCreatorProjectDocument;
  readonly sourceInfo?: LoopSourceInfo;
  readonly tier: 'FREE' | 'CREATOR' | 'PRO';
  readonly disabled: boolean;
  readonly summary: {
    actualDurationMs: number;
    cycleCount: number;
    adjustedToTier: boolean;
  } | null;
  readonly onChange: (document: LoopCreatorProjectDocument) => void;
  readonly onRender: () => void;
}

const DURATION_PRESETS = [
  { milliseconds: 5 * 60 * 1000, label: '5 menit', minTier: 'FREE' },
  { milliseconds: 15 * 60 * 1000, label: '15 menit', minTier: 'FREE' },
  { milliseconds: 30 * 60 * 1000, label: '30 menit', minTier: 'CREATOR' },
  { milliseconds: 60 * 60 * 1000, label: '60 menit', minTier: 'CREATOR' },
  { milliseconds: 2 * 60 * 60 * 1000, label: '2 jam', minTier: 'PRO' },
  { milliseconds: 3 * 60 * 60 * 1000, label: '3 jam', minTier: 'PRO' },
] as const;
const TIER_LEVEL = { FREE: 0, CREATOR: 1, PRO: 2 } as const;
const TIER_MAX_DURATION_MS = {
  FREE: 15 * 60 * 1000,
  CREATOR: 60 * 60 * 1000,
  PRO: 3 * 60 * 60 * 1000,
} as const;
const RATIOS = [
  { value: 'original', label: 'Original' },
  { value: '16:9', label: 'Landscape' },
  { value: '9:16', label: 'Portrait' },
  { value: '1:1', label: 'Square' },
  { value: '4:5', label: 'Feed' },
] as const;

export function LoopSettingsPanel({
  document,
  sourceInfo,
  tier,
  disabled,
  summary,
  onChange,
  onRender,
}: LoopSettingsPanelProps) {
  const durationMs = sourceInfo?.durationMs ?? 0;
  const startMs = document.trim.enabled ? document.trim.startMs : 0;
  const endMs = document.trim.enabled ? (document.trim.endMs ?? durationMs) : durationMs;
  const segmentMs = Math.max(0, endMs - startMs);
  const smooth = document.transition.mode === 'smooth';
  const transitionMs = smooth ? resolveAutomaticTransitionDurationMs(segmentMs) : 0;
  const cycleMs = Math.max(1, segmentMs - transitionMs);
  const requestedCycles = segmentMs ? Math.ceil(document.output.targetDurationMs / cycleMs) : 0;
  const maximumCycles = segmentMs ? Math.floor(TIER_MAX_DURATION_MS[tier] / cycleMs) : 0;
  const estimateCycles = Math.min(requestedCycles, maximumCycles);
  const estimatedDurationMs = estimateCycles * cycleMs;
  const estimateAdjustedToTier = requestedCycles > maximumCycles;

  const patch = (value: Partial<LoopCreatorProjectDocument>) => onChange({ ...document, ...value });

  return (
    <Card className="border-border/60 bg-card/70">
      <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Settings2 size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-tight">Pengaturan Loop</h2>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">
            Cepat dan sederhana
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-6 p-5">
        <section className="space-y-3">
          <SectionTitle icon={Film} title="Durasi hasil" />
          <div className="grid grid-cols-2 gap-2">
            {DURATION_PRESETS.map((preset) => {
              const available = TIER_LEVEL[tier] >= TIER_LEVEL[preset.minTier];
              return (
                <button
                  key={preset.milliseconds}
                  type="button"
                  disabled={!available}
                  onClick={() =>
                    patch({ output: { ...document.output, targetDurationMs: preset.milliseconds } })
                  }
                  className={cn(
                    'h-12 rounded-xl border text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-35',
                    document.output.targetDurationMs === preset.milliseconds
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/60 bg-muted/10 hover:bg-muted/20',
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          {segmentMs > 0 ? (
            <div className="flex items-center justify-between rounded-xl bg-muted/15 px-3 py-2.5 text-xs font-semibold">
              <span className="text-muted-foreground">Hasil aktual</span>
              <span>
                {formatDuration(summary?.actualDurationMs ?? estimatedDurationMs)} -{' '}
                {summary?.cycleCount ?? estimateCycles} putaran
              </span>
            </div>
          ) : null}
          {(summary?.adjustedToTier ?? estimateAdjustedToTier) ? (
            <p className="text-xs font-semibold text-primary">
              Durasi disesuaikan dengan batas paket kamu.
            </p>
          ) : null}
        </section>

        {document.trim.enabled && sourceInfo ? (
          <section className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-3.5">
            <p className="flex items-start gap-2 text-xs font-semibold text-foreground">
              <Info size={15} className="mt-0.5 shrink-0 text-primary" />
              Draft lama ini menggunakan potongan video ({formatDuration(startMs)} -{' '}
              {formatDuration(endMs)}).
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full rounded-lg border-primary/25 text-primary"
              onClick={() => patch({ trim: { enabled: false, startMs: 0 } })}
            >
              Gunakan Video Penuh
            </Button>
          </section>
        ) : null}

        <section className="space-y-3 border-t border-border/40 pt-5">
          <p className="text-[11px] font-black uppercase text-muted-foreground">Sambungan loop</p>
          <div className="grid grid-cols-2 gap-2">
            <Choice
              selected={!smooth}
              label="Loop Asli"
              onClick={() => patch({ transition: { mode: 'repeat' } })}
            />
            <Choice
              selected={smooth}
              label="Loop Seamless"
              disabled={segmentMs < 1000}
              onClick={() => patch({ transition: { mode: 'smooth' } })}
            />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {smooth
              ? 'Terbaik untuk ambience satu sudut dengan gerakan dan cahaya stabil. Cut atau perubahan besar tetap dapat terlihat.'
              : 'Mengulang langsung, cocok jika akhir dan awal video sudah menyatu.'}
          </p>
        </section>

        {sourceInfo?.hasAudio ? (
          <section className="flex items-center justify-between border-t border-border/40 pt-5">
            <SectionTitle icon={VolumeX} title="Mute audio bawaan" />
            <Switch
              checked={document.audioMuted}
              onCheckedChange={(audioMuted) => patch({ audioMuted })}
            />
          </section>
        ) : null}

        <section className="space-y-3 border-t border-border/40 pt-5">
          <p className="text-[11px] font-black uppercase text-muted-foreground">Format video</p>
          <div className="grid grid-cols-2 gap-2">
            {RATIOS.map((ratio) => (
              <button
                key={ratio.value}
                type="button"
                className={cn(
                  'flex h-16 items-center gap-3 rounded-xl border px-3 text-left transition-colors',
                  ratio.value === 'original' && 'col-span-2',
                  document.output.aspectRatio === ratio.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/60 bg-muted/10 hover:bg-muted/20',
                )}
                onClick={() => patch({ output: { ...document.output, aspectRatio: ratio.value } })}
              >
                <RatioMark ratio={ratio.value} sourceInfo={sourceInfo} />
                <span>
                  <span className="block text-sm font-bold">{ratio.label}</span>
                  <span className="block text-xs font-semibold text-muted-foreground">
                    {ratio.value === 'original' ? 'Rasio sumber' : ratio.value}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {document.output.aspectRatio !== 'original' ? (
            <p className="text-xs font-medium text-muted-foreground">
              Video akan dibuat Fit dengan blur background otomatis.
            </p>
          ) : null}
        </section>

        <Button
          size="lg"
          className="h-12 w-full rounded-xl font-black"
          disabled={disabled || !sourceInfo}
          onClick={onRender}
        >
          Render Video Loop
        </Button>
      </CardBody>
    </Card>
  );
}

function RatioMark({
  ratio,
  sourceInfo,
}: {
  ratio: LoopCreatorProjectDocument['output']['aspectRatio'];
  sourceInfo?: LoopSourceInfo;
}) {
  const value =
    ratio === 'original'
      ? sourceInfo
        ? sourceInfo.width / sourceInfo.height
        : 16 / 9
      : { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:5': 4 / 5 }[ratio];
  return (
    <span className="flex h-10 w-12 shrink-0 items-center justify-center rounded-lg bg-muted/20">
      <span
        className="block rounded border-2 border-current opacity-70"
        style={value >= 1 ? { width: 34, aspectRatio: value } : { height: 32, aspectRatio: value }}
      />
    </span>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Film; title: string }) {
  return (
    <p className="flex items-center gap-2 text-[11px] font-black uppercase text-muted-foreground">
      <Icon size={14} className="text-primary" />
      {title}
    </p>
  );
}

function Choice({
  selected,
  label,
  disabled,
  onClick,
}: {
  selected: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-12 rounded-xl border text-sm font-bold disabled:opacity-35',
        selected ? 'border-primary bg-primary/10 text-primary' : 'border-border/60 bg-muted/10',
      )}
    >
      {label}
    </button>
  );
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.round(milliseconds / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function resolveAutomaticTransitionDurationMs(segmentDurationMs: number): number {
  return Math.min(2000, Math.floor(segmentDurationMs * 0.3));
}
