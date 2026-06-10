import {
  AlertCircle,
  CheckCircle2,
  FileVideo,
  Flame,
  Info,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getRecommendedCandidates } from '@/components/director/steps/picking-recommendations';
import { Button, Modal, ModalBody, ModalContent } from '@/components/ui';
import { useAuthenticatedObjectUrl } from '@/hooks/use-authenticated-object-url';
import { useMutableSearchParams } from '@/lib/route-search';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';
import type { Candidate, DirectorSession } from '@/stores/director-store';
import { useDirectorStore } from '@/stores/director-store';

type CandidateRecommendation = ReturnType<typeof getRecommendedCandidates>[number];

function isTranscriptCompletionConfident(clip: Candidate): boolean {
  return clip.metadata?.transcriptWindow?.boundaryConfidence === 'high';
}

function normalizeMomentLabel(label: string): string {
  const normalized = label.trim().toLowerCase();

  if (normalized.includes('kalimat') || normalized.includes('completion')) return 'Kalimat selesai';
  if (normalized.includes('hook')) return 'Hook kuat';
  if (normalized.includes('energy') || normalized.includes('energi')) return 'Energi tinggi';
  if (normalized.includes('dialog')) return 'Dialog jelas';
  if (normalized.includes('durasi') || normalized.includes('fast')) return 'Durasi pas';
  if (normalized.includes('visual') || normalized.includes('clarity')) return 'Visual jelas';

  return label
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(' ');
}

function getCandidateBadges(clip: Candidate, recommendationLabel?: string): string[] {
  const ruleLabels =
    clip.metadata?.aiRerank?.reasonLabels ?? clip.metadata?.scoreBreakdown?.rule?.reasonLabels;
  const badges = clip.metadata?.scoreBreakdown?.badges?.length
    ? clip.metadata.scoreBreakdown.badges
    : [
        clip.tags?.includes('HIGH ENERGY') ? 'High Energy' : 'Highlight',
        Math.round((clip.endMs - clip.startMs) / 1000) <= 18 ? 'Fast' : 'Durasi Pas',
      ];

  const rawBadges = [
    ...(ruleLabels?.length ? ruleLabels : []),
    ...badges,
    ...(recommendationLabel ? [recommendationLabel] : []),
  ];
  const deduped = new Map<string, string>();

  for (const badge of rawBadges) {
    const normalized = normalizeMomentLabel(badge);
    if (normalized === 'Kalimat selesai' && !isTranscriptCompletionConfident(clip)) {
      continue;
    }

    deduped.set(normalized.toLowerCase(), normalized);
  }

  return [...deduped.values()].slice(0, 2);
}

function getCandidateDurationSeconds(clip: Candidate): number {
  return Math.max(1, Math.round((clip.endMs - clip.startMs) / 1000));
}

function getPrimaryMomentLabel(clip: Candidate, recommendation?: { label: string }): string {
  if (recommendation?.label) {
    return normalizeMomentLabel(recommendation.label);
  }

  const aiMeta = clip.metadata?.aiRerank;
  const ruleLabels = aiMeta?.reasonLabels ?? clip.metadata?.scoreBreakdown?.rule?.reasonLabels;
  if (ruleLabels?.[0]) {
    return normalizeMomentLabel(ruleLabels[0]);
  }

  if (aiMeta) {
    if (aiMeta.hookScore >= 80) return 'Hook kuat';
    if (aiMeta.clarityScore >= 80) return 'Visual jelas';
    if (aiMeta.viralScore >= 80) return 'Potensi viral';
  }

  const badges = clip.metadata?.scoreBreakdown?.badges ?? [];
  const badge = badges[0] ?? clip.tags?.[0];
  if (badge) {
    return normalizeMomentLabel(badge);
  }

  const duration = getCandidateDurationSeconds(clip);
  if (duration >= 20 && duration <= 90) {
    return 'Durasi pas';
  }

  return 'Momen menonjol';
}

function getCandidateReason(clip: Candidate, recommendation?: { reason: string }): string {
  const reason =
    recommendation?.reason ??
    clip.metadata?.aiRerank?.reason ??
    clip.metadata?.scoreBreakdown?.topSignals?.[0];

  if (!reason) {
    return 'Klip ini punya ritme yang cukup kuat untuk dijadikan Short.';
  }

  return reason;
}

function getFeaturedCandidate(
  candidates: readonly Candidate[],
  recommendations: readonly CandidateRecommendation[],
): Candidate | null {
  const recommendedId = recommendations[0]?.candidateId;
  const recommendedCandidate = recommendedId
    ? candidates.find((candidate) => candidate.id === recommendedId)
    : null;

  return recommendedCandidate ?? candidates[0] ?? null;
}

function getBadgeIcon(badge: string) {
  const normalizedBadge = badge.toLowerCase();

  if (normalizedBadge === 'high energy' || normalizedBadge === 'hook kuat') {
    return <Flame size={10} className="shrink-0" />;
  }

  if (normalizedBadge === 'durasi pas' || normalizedBadge === 'fast') {
    return <Timer size={10} className="shrink-0" />;
  }

  return <Sparkles size={10} className="shrink-0" />;
}

interface CandidatePosterProps {
  readonly activeSession: DirectorSession;
  readonly clip: Candidate;
  readonly className?: string;
  readonly imageClassName?: string;
}

function CandidatePoster({
  activeSession,
  clip,
  className,
  imageClassName,
}: Readonly<CandidatePosterProps>) {
  const previewUrl = useAuthenticatedObjectUrl(
    `/api/v1/director/sessions/${activeSession.id}/clips/${clip.id}/poster`,
  );

  if (!previewUrl) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-muted/30 text-muted-foreground/35',
          className,
        )}
      >
        <FileVideo size={44} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={previewUrl}
      alt={`Preview klip ${clip.rank ?? 1}`}
      className={cn('h-full w-full object-cover', className, imageClassName)}
      onError={(event) => {
        event.currentTarget.style.display = 'none';
        event.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
      }}
    />
  );
}

interface CandidateCardProps {
  readonly activeSession: DirectorSession;
  readonly clip: Candidate;
  readonly recommendation?: CandidateRecommendation;
  readonly isSelected: boolean;
  readonly isPlaying: boolean;
  readonly onToggleSelection: () => void;
  readonly onStartPlaying: () => void;
  readonly onStopPlaying: () => void;
}

function CandidateCard({
  activeSession,
  clip,
  recommendation,
  isSelected,
  isPlaying,
  onToggleSelection,
  onStartPlaying,
  onStopPlaying,
}: Readonly<CandidateCardProps>) {
  const duration = getCandidateDurationSeconds(clip);
  const primaryLabel = getPrimaryMomentLabel(clip, recommendation);
  const visibleBadges = getCandidateBadges(clip, recommendation?.label)
    .filter((badge) => normalizeMomentLabel(badge) !== primaryLabel)
    .slice(0, 1);
  const playButtonLabel = isPlaying
    ? `Hentikan preview klip ${clip.rank}`
    : `Putar preview klip ${clip.rank}`;

  return (
    <div
      className={cn(
        'group relative aspect-video overflow-hidden rounded-2xl border bg-muted/20 transition-all duration-300',
        isSelected
          ? 'border-primary/80 shadow-lg shadow-primary/10'
          : 'border-border/60 hover:border-primary/35',
      )}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={`Pilih klip durasi ${duration} detik`}
        onClick={onToggleSelection}
        className="absolute inset-0 z-20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />
      <div className="pointer-events-none absolute inset-0 bg-black">
        <CandidatePoster
          activeSession={activeSession}
          clip={clip}
          imageClassName="opacity-85 transition-opacity duration-300 group-hover:opacity-100"
        />
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (isPlaying) {
            onStopPlaying();
            return;
          }
          onStartPlaying();
        }}
        className="absolute left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-black/40 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-black/55"
        aria-label={playButtonLabel}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-white" />
        ) : (
          <Play className="h-4 w-4 fill-white" />
        )}
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleSelection();
        }}
        aria-label={`Toggle select klip ${clip.rank ?? 1}`}
        className={cn(
          'absolute right-3 top-3 z-40 flex h-8 w-8 items-center justify-center rounded-2xl border-2 transition-all duration-300',
          isSelected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-white/30 bg-black/20 text-transparent backdrop-blur-md group-hover:border-white/65',
        )}
      >
        <CheckCircle2 size={16} strokeWidth={3} />
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/90 via-black/40 to-transparent px-3 pt-16 pb-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur-sm">
            <Info size={11} className="text-white/65" />
            {primaryLabel}
          </span>
          <span className="inline-flex min-w-14 justify-center rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur-sm">
            {duration}s
          </span>
        </div>
        {visibleBadges.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {visibleBadges.map((badge) => (
              <span
                key={`${clip.id}-${badge}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[9px] font-bold tracking-wide text-white/85 backdrop-blur-sm"
              >
                {getBadgeIcon(badge)}
                {normalizeMomentLabel(badge)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface FeaturedCandidateCardProps {
  readonly activeSession: DirectorSession;
  readonly clip: Candidate;
  readonly recommendation?: CandidateRecommendation;
  readonly isSelected: boolean;
  readonly isPlaying: boolean;
  readonly isLoading: boolean;
  readonly onStartPlaying: () => void;
  readonly onStopPlaying: () => void;
  readonly onUseCandidate: () => void;
}

function FeaturedCandidateCard({
  activeSession,
  clip,
  recommendation,
  isSelected,
  isPlaying,
  isLoading,
  onStartPlaying,
  onStopPlaying,
  onUseCandidate,
}: Readonly<FeaturedCandidateCardProps>) {
  const duration = getCandidateDurationSeconds(clip);
  const primaryLabel = getPrimaryMomentLabel(clip, recommendation);
  const reason = getCandidateReason(clip, recommendation);
  const visibleBadges = getCandidateBadges(clip, recommendation?.label).filter(
    (badge) => normalizeMomentLabel(badge) !== primaryLabel,
  );

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-card/70 shadow-lg shadow-black/5 transition-colors sm:rounded-3xl',
        isSelected ? 'border-primary/65' : 'border-border/60',
      )}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <div className="relative aspect-video overflow-hidden bg-black lg:aspect-auto lg:min-h-76">
          <CandidatePoster
            activeSession={activeSession}
            clip={clip}
            imageClassName="opacity-90 transition-opacity duration-300 hover:opacity-100"
          />
          <button
            type="button"
            onClick={() => {
              if (isPlaying) {
                onStopPlaying();
                return;
              }
              onStartPlaying();
            }}
            className="absolute left-5 top-5 z-30 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/45 text-white backdrop-blur-md transition hover:scale-105 hover:bg-black/60"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-white" />
            ) : (
              <Play className="h-5 w-5 fill-white" />
            )}
          </button>
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/25 to-transparent p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
                Rekomendasi AI
              </span>
              <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                #{clip.rank ?? 1}
              </span>
              <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                {duration} detik
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 border-t border-border/60 p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="space-y-4 sm:space-y-5">
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
                Pilihan terbaik
              </p>
              <h3 className="text-2xl font-black tracking-tight text-foreground">
                Klip paling siap jadi Short
              </h3>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/15 p-4 sm:p-5">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                <Sparkles size={16} className="text-primary" />
                {primaryLabel}
              </div>
              <p className="text-sm font-medium leading-6 text-muted-foreground">{reason}</p>
            </div>
            {visibleBadges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {visibleBadges.map((badge) => (
                  <span
                    key={`${clip.id}-featured-${badge}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-3 py-1.5 text-xs font-bold text-muted-foreground"
                  >
                    {getBadgeIcon(badge)}
                    {normalizeMomentLabel(badge)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-2xl"
              onClick={() => {
                if (isPlaying) {
                  onStopPlaying();
                  return;
                }
                onStartPlaying();
              }}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              Preview
            </Button>
            <Button
              type="button"
              className="min-h-11 rounded-2xl font-bold"
              isLoading={isLoading}
              onClick={onUseCandidate}
            >
              <CheckCircle2 size={16} />
              Gunakan Klip Ini
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VideoPreviewPlayerProps {
  readonly sessionId: string;
  readonly clipId: string;
  readonly onStop?: () => void;
}

type PlayerState = 'queued' | 'processing' | 'loading-file' | 'ready' | 'error';
type PreviewJobStatus = 'READY' | 'QUEUED' | 'PROCESSING' | 'FAILED';

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const STATUS_POLL_DELAY_MS = 1400;

interface PreviewJobData {
  status: PreviewJobStatus;
  previewUrl?: string;
  progress?: number;
  errorMessage?: string;
}

function parsePreviewJobData(payload: unknown): PreviewJobData | null {
  if (typeof payload !== 'object' || payload === null || !('data' in payload)) {
    return null;
  }

  const data = payload.data;
  if (typeof data !== 'object' || data === null || !('status' in data)) {
    return null;
  }

  const status = data.status;
  if (status !== 'READY' && status !== 'QUEUED' && status !== 'PROCESSING' && status !== 'FAILED') {
    return null;
  }

  return {
    status,
    previewUrl:
      'previewUrl' in data && typeof data.previewUrl === 'string' ? data.previewUrl : undefined,
    progress: 'progress' in data && typeof data.progress === 'number' ? data.progress : undefined,
    errorMessage:
      'errorMessage' in data && typeof data.errorMessage === 'string'
        ? data.errorMessage
        : undefined,
  };
}

async function readPreviewJobData(url: string, init?: RequestInit): Promise<PreviewJobData> {
  const response = await authFetch(url, init);
  if (!response.ok && response.status !== 202) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();
  const data = parsePreviewJobData(payload);
  if (!data) {
    throw new Error('Invalid preview response');
  }

  return data;
}

async function fetchPreviewBlob(previewUrl: string, signal: AbortSignal): Promise<Blob> {
  const response = await authFetch(previewUrl, { signal });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.startsWith('video/')) {
    throw new Error(`Unexpected content type: ${contentType}`);
  }

  return response.blob();
}

function getPreviewStatusText(
  playerState: PlayerState,
  progress: number | null,
  attemptCount: number,
): string {
  if (playerState === 'queued') {
    return 'Preview masuk antrean...';
  }

  if (playerState === 'processing') {
    const progressText = typeof progress === 'number' ? ` ${Math.round(progress)}%` : '';
    return `Menyiapkan preview${progressText}...`;
  }

  if (attemptCount <= 1) {
    return 'Mengambil preview...';
  }

  return `Mencoba ulang (${attemptCount}/${MAX_AUTO_RETRIES})...`;
}

const VideoPreviewPlayer = ({ sessionId, clipId, onStop }: VideoPreviewPlayerProps) => {
  const [playerState, setPlayerState] = useState<PlayerState>('queued');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [manualRetryKey, setManualRetryKey] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [progress, setProgress] = useState<number | null>(null);
  const urlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: manualRetryKey resets the retry cycle intentionally
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const markPreviewError = () => {
      if (!controller.signal.aborted) {
        setPlayerState('error');
      }
    };

    const installPreviewBlob = (blob: Blob) => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }

      const nextUrl = URL.createObjectURL(blob);
      urlRef.current = nextUrl;
      setObjectUrl(nextUrl);
      setPlayerState('ready');
    };

    const scheduleStatusPoll = () => {
      timer = setTimeout(() => {
        void pollPreviewStatus().catch(markPreviewError);
      }, STATUS_POLL_DELAY_MS);
    };

    const scheduleFileRetry = (previewUrl: string, attempt: number) => {
      timer = setTimeout(() => {
        void fetchPreviewFile(previewUrl, attempt);
      }, RETRY_DELAY_MS);
    };

    const handlePreviewFileFailure = (previewUrl: string, attempt: number) => {
      if (controller.signal.aborted) {
        return;
      }

      if (attempt < MAX_AUTO_RETRIES) {
        scheduleFileRetry(previewUrl, attempt + 1);
        return;
      }

      setPlayerState('error');
    };

    const handlePreviewJob = (data: PreviewJobData) => {
      setProgress(data.progress ?? null);

      if (data.status === 'READY' && data.previewUrl) {
        void fetchPreviewFile(data.previewUrl, 1);
        return;
      }

      if (data.status === 'FAILED') {
        setPlayerState('error');
        return;
      }

      setPlayerState(data.status === 'PROCESSING' ? 'processing' : 'queued');
      scheduleStatusPoll();
    };

    const fetchPreviewFile = async (previewUrl: string, attempt: number): Promise<void> => {
      if (controller.signal.aborted) return;

      setPlayerState('loading-file');
      setAttemptCount(attempt);

      try {
        const blob = await fetchPreviewBlob(previewUrl, controller.signal);
        if (controller.signal.aborted) return;
        installPreviewBlob(blob);
      } catch {
        handlePreviewFileFailure(previewUrl, attempt);
      }
    };

    const pollPreviewStatus = async (): Promise<void> => {
      const data = await readPreviewJobData(
        `/api/v1/director/sessions/${sessionId}/clips/${clipId}/preview/status`,
        { signal: controller.signal },
      );
      handlePreviewJob(data);
    };

    const startPreview = async (): Promise<void> => {
      setPlayerState('queued');
      setProgress(null);
      setAttemptCount(0);

      const data = await readPreviewJobData(
        `/api/v1/director/sessions/${sessionId}/clips/${clipId}/preview`,
        {
          method: 'POST',
          signal: controller.signal,
        },
      );
      handlePreviewJob(data);
    };

    void startPreview().catch(() => {
      markPreviewError();
    });

    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [sessionId, clipId, manualRetryKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || playerState !== 'ready' || !objectUrl) return;

    video.muted = true;
    void video
      .play()
      .then(() => {
        video.muted = false;
      })
      .catch(() => {
        // Autoplay blocked — user can click play manually via controls
      });
  }, [playerState, objectUrl]);

  const handleManualRetry = () => {
    setObjectUrl(null);
    setManualRetryKey((prev) => prev + 1);
  };

  const handleVideoPlaybackError = () => {
    // Stop automatic retry loops when the browser cannot decode/play this blob.
    // Let users retry explicitly via the error state CTA.
    setPlayerState('error');
  };

  if (playerState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10">
          <AlertCircle size={28} className="text-rose-600 dark:text-rose-300" />
        </div>
        <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          Video gagal dimuat
        </span>
        <p className="max-w-xs text-center text-xs text-muted-foreground">
          Server mungkin sedang sibuk memproses video ini. Coba lagi dalam beberapa saat.
        </p>
        <button
          type="button"
          onClick={handleManualRetry}
          className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-primary backdrop-blur-md transition-all hover:bg-primary/15"
        >
          <RefreshCw size={14} />
          Coba Lagi
        </button>
      </div>
    );
  }

  if (playerState !== 'ready' || !objectUrl) {
    const statusText = getPreviewStatusText(playerState, progress, attemptCount);
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <span className="text-sm font-medium animate-pulse">{statusText}</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={objectUrl}
      className="max-h-full max-w-full object-contain shadow-2xl"
      controls
      playsInline
      onEnded={onStop}
      onError={handleVideoPlaybackError}
    >
      <track kind="captions" srcLang="id" label="Preview" />
    </video>
  );
};

export const PickingStep = () => {
  const [, setSearchParams] = useMutableSearchParams();
  const {
    activeSession,
    candidates,
    selectedCandidateIds,
    toggleCandidateSelection,
    playingClipId,
    setPlayingClipId,
    setStep,
    isLoading,
    setLoading,
    setError,
    setSelectedClips,
    reset,
  } = useDirectorStore();
  const recommendations = useMemo(() => getRecommendedCandidates(candidates), [candidates]);
  const featuredCandidate = useMemo(
    () => getFeaturedCandidate(candidates, recommendations),
    [candidates, recommendations],
  );
  const featuredRecommendation = featuredCandidate
    ? recommendations.find((item) => item.candidateId === featuredCandidate.id)
    : undefined;
  const otherCandidates = useMemo(
    () => candidates.filter((candidate) => candidate.id !== featuredCandidate?.id).slice(0, 6),
    [candidates, featuredCandidate?.id],
  );
  const selectedCandidateId = selectedCandidateIds.values().next().value;
  const selectedCandidate = selectedCandidateId
    ? (candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null)
    : null;
  const selectedCandidateDuration = selectedCandidate
    ? getCandidateDurationSeconds(selectedCandidate)
    : null;

  const handleClipSelection = async (candidateIds = Array.from(selectedCandidateIds)) => {
    if (!activeSession || candidateIds.length === 0) return;

    try {
      setLoading(true);
      const res = await authFetch(`/api/v1/director/sessions/${activeSession.id}/clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipIds: candidateIds }),
      });
      const data = await res.json();

      if (data.success) {
        setSelectedClips(data.data);
        setStep('EDITING');
      } else {
        throw new Error(data.error?.message || 'Selection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Selection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-br from-primary via-orange-500 to-rose-600">
            Pilih Momen Terbaik
          </h2>
          <p className="text-muted-foreground font-medium">
            Pilih satu momen yang paling siap dijadikan Short.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setSearchParams({}, { replace: true });
          }}
          className="self-end sm:self-auto shrink-0 flex items-center justify-center gap-2 border px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-primary border-primary/20 bg-primary/10 hover:bg-primary/20 shadow-sm transition-all"
        >
          <Plus size={16} strokeWidth={3} className="shrink-0" />
          Buat Baru
        </button>
      </div>

      {activeSession && featuredCandidate ? (
        <section className="space-y-3 mb-6">
          <div className="flex items-center justify-end gap-2">
            <Sparkles size={16} className="text-primary" />
            <h3 className="text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">
              Rekomendasi AI
            </h3>
          </div>
          <FeaturedCandidateCard
            activeSession={activeSession}
            clip={featuredCandidate}
            recommendation={featuredRecommendation}
            isSelected={selectedCandidateIds.has(featuredCandidate.id)}
            isPlaying={playingClipId === featuredCandidate.id}
            isLoading={isLoading}
            onStartPlaying={() => setPlayingClipId(featuredCandidate.id)}
            onStopPlaying={() => setPlayingClipId(null)}
            onUseCandidate={() => {
              void handleClipSelection([featuredCandidate.id]);
            }}
          />
        </section>
      ) : null}

      <section className="mt-6 pb-5 sm:pb-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-xl font-black tracking-tight text-foreground">Kandidat Lainnya</h3>
            <p className="text-sm font-medium text-muted-foreground">
              Bandingkan alternatif lain jika rekomendasi utama belum cocok.
            </p>
          </div>
          <span className="hidden rounded-full border border-border/60 bg-muted/15 px-3 py-1.5 text-xs font-bold text-muted-foreground sm:inline-flex">
            {otherCandidates.length} pilihan
          </span>
        </div>

        {otherCandidates.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {activeSession &&
              otherCandidates.map((clip) => (
                <CandidateCard
                  key={clip.id}
                  activeSession={activeSession}
                  clip={clip}
                  recommendation={recommendations.find((item) => item.candidateId === clip.id)}
                  isSelected={selectedCandidateIds.has(clip.id)}
                  isPlaying={playingClipId === clip.id}
                  onToggleSelection={() => toggleCandidateSelection(clip.id)}
                  onStartPlaying={() => setPlayingClipId(clip.id)}
                  onStopPlaying={() => setPlayingClipId(null)}
                />
              ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-border/60 bg-card/50 p-6 text-sm font-medium text-muted-foreground">
            AI hanya menemukan satu kandidat yang paling layak untuk video ini.
          </div>
        )}
      </section>

      <Modal open={playingClipId !== null} onOpenChange={(open) => !open && setPlayingClipId(null)}>
        <ModalContent className="max-w-4xl overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-0 shadow-2xl sm:rounded-4xl [&>button]:hidden">
          <ModalBody className="p-0">
            {playingClipId && activeSession && (
              <div className="relative flex h-[85vh] w-full items-center justify-center bg-black">
                <VideoPreviewPlayer
                  key={playingClipId}
                  sessionId={activeSession.id}
                  clipId={playingClipId}
                  onStop={() => setPlayingClipId(null)}
                />
                <button
                  type="button"
                  onClick={() => setPlayingClipId(null)}
                  className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground backdrop-blur-md transition-all hover:bg-background"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <div className="sticky bottom-0 z-50 mt-3 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="mx-auto flex w-full max-w-lg flex-col items-stretch justify-between gap-3 rounded-2xl border border-border/50 bg-card/90 p-3 shadow-lg shadow-black/10 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-foreground">
                {selectedCandidate ? 'Klip terpilih' : 'Pilih 1 momen untuk lanjut'}
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {selectedCandidate
                  ? `${selectedCandidateDuration} detik · siap masuk Edit Short`
                  : 'Pilih 1 klip untuk lanjut'}
              </span>
            </div>
          </div>
          <Button
            className="min-h-11 rounded-2xl px-6 text-[11px] font-black uppercase tracking-widest sm:self-end"
            variant="default"
            disabled={selectedCandidateIds.size === 0 || isLoading}
            isLoading={isLoading}
            onClick={() => {
              void handleClipSelection();
            }}
          >
            Gunakan Klip Ini
          </Button>
        </div>
      </div>
    </div>
  );
};
