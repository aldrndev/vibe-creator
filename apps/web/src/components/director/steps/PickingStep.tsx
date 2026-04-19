import {
  AlertCircle,
  CheckCircle2,
  FileVideo,
  Flame,
  Gauge,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Timer,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { getRecommendedCandidates } from '@/components/director/steps/picking-recommendations';
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import { useAuthenticatedObjectUrl } from '@/hooks/use-authenticated-object-url';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';
import type { Candidate, DirectorSession } from '@/stores/director-store';
import { useDirectorStore } from '@/stores/director-store';

interface CandidateCardProps {
  readonly activeSession: DirectorSession;
  readonly clip: Candidate;
  readonly recommendation?: {
    label: string;
    reason: string;
  };
  readonly isSelected: boolean;
  readonly isPlaying: boolean;
  readonly onToggleSelection: () => void;
  readonly onStartPlaying: () => void;
  readonly onStopPlaying: () => void;
}

function getCandidateBadges(clip: Candidate, recommendationLabel?: string): string[] {
  const badges = clip.metadata?.scoreBreakdown?.badges?.length
    ? clip.metadata.scoreBreakdown.badges
    : [
        clip.tags?.includes('HIGH ENERGY') ? 'High Energy' : 'Highlight',
        Math.round((clip.endMs - clip.startMs) / 1000) <= 18 ? 'Fast' : 'Durasi Pas',
      ];

  if (!recommendationLabel) {
    return badges.slice(0, 2);
  }

  return Array.from(new Set([...badges, recommendationLabel])).slice(0, 2);
}

function getBadgeIcon(badge: string) {
  if (badge === 'High Energy' || badge === 'Hook Kuat') {
    return <Flame size={10} className="shrink-0" />;
  }

  if (badge === 'Durasi Pas' || badge === 'Fast') {
    return <Timer size={10} className="shrink-0" />;
  }

  return <Sparkles size={10} className="shrink-0" />;
}

function getCandidateScoreTooltip(clip: Candidate, recommendation?: { reason: string }): string[] {
  const breakdown = clip.metadata?.scoreBreakdown;
  const aiMeta = clip.metadata?.aiRerank;
  const aiReason = aiMeta?.reason ?? recommendation?.reason;

  return [
    `Skor final: ${Math.round(aiMeta?.compositeScore ?? clip.score * 100)}`,
    breakdown ? `Energy: ${breakdown.energy}` : null,
    breakdown ? `Dialog: ${breakdown.dialogDensity}` : null,
    breakdown ? `Durasi fit: ${breakdown.durationFit}` : null,
    breakdown && breakdown.visualPenalty > 0 ? `Penalty visual: ${breakdown.visualPenalty}` : null,
    aiMeta ? `Viral: ${aiMeta.viralScore}` : null,
    aiMeta ? `Hook: ${aiMeta.hookScore}` : null,
    aiMeta ? `Clarity: ${aiMeta.clarityScore}` : null,
    aiReason ? `AI: ${aiReason}` : null,
  ].filter((line): line is string => Boolean(line));
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
  const [isLandscape, setIsLandscape] = useState(false);
  const previewUrl = useAuthenticatedObjectUrl(
    `/api/v1/director/sessions/${activeSession.id}/clips/${clip.id}/poster`,
  );
  const duration = Math.round((clip.endMs - clip.startMs) / 1000);
  const aspectClass = isLandscape ? 'aspect-video' : 'aspect-9/16';
  const scoreTooltip = getCandidateScoreTooltip(clip, recommendation);
  const visibleBadges = getCandidateBadges(clip, recommendation?.label);
  const playButtonLabel = isPlaying
    ? `Hentikan preview klip ${clip.rank}`
    : `Putar preview klip ${clip.rank}`;
  let mediaContent: ReactNode;

  if (previewUrl) {
    mediaContent = (
      <img
        src={previewUrl}
        alt={`Clip ${clip.rank}`}
        className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-500 bg-black"
        onLoad={(e) => {
          setIsLandscape(e.currentTarget.naturalWidth > e.currentTarget.naturalHeight);
        }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
        }}
      />
    );
  } else {
    mediaContent = (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
        <FileVideo size={48} strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          'group relative bg-muted/20 rounded-2xl overflow-hidden border-2 transition-all duration-300',
          aspectClass,
          isSelected
            ? 'border-primary scale-[1.02] z-10'
            : 'border-border/50 hover:border-primary/35 hover:scale-[1.01]',
        )}
      >
        <button
          type="button"
          aria-pressed={isSelected}
          aria-label={`Pilih klip durasi ${duration} detik`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelection();
          }}
          className="absolute inset-0 z-20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
        <div className="pointer-events-none absolute inset-0 bg-muted/40 transition-colors group-hover:bg-muted/30">
          {mediaContent}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (isPlaying) {
              onStopPlaying();
              return;
            }
            onStartPlaying();
          }}
          className="absolute top-4 left-4 z-40 w-10 h-10 rounded-2xl border border-white/20 bg-black/35 text-white backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-black/50 flex items-center justify-center"
          aria-label={playButtonLabel}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-white" />
          ) : (
            <Play className="w-4 h-4 fill-white" />
          )}
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelection();
          }}
          aria-label={`Toggle select klip ${clip.rank}`}
          className={cn(
            'absolute top-4 right-4 z-40 w-7 h-7 rounded-2xl border-2 flex items-center justify-center transition-all duration-500',
            isSelected
              ? 'bg-primary border-primary text-white rotate-0 scale-110'
              : 'bg-black/20 backdrop-blur-md border-white/30 text-transparent group-hover:border-white/60 -rotate-12 group-hover:rotate-0',
          )}
        >
          <CheckCircle2 size={16} strokeWidth={3} />
        </button>

        {!isPlaying && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-linear-to-t from-black/95 via-black/50 to-transparent px-4 pt-24 pb-4 transition-colors duration-500 group-hover:from-black/98 group-hover:via-black/60">
            <div className="flex items-center justify-between gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    className="pointer-events-auto inline-flex min-w-24 justify-center rounded-lg border border-primary/30 bg-primary/20 px-3 py-1 text-center backdrop-blur-md"
                    aria-label={`Lihat detail skor klip ${clip.rank}`}
                  >
                    <span className="inline-flex items-center justify-center gap-1 text-[10px] font-black text-primary uppercase tracking-tighter">
                      <Gauge size={10} className="shrink-0" />
                      SKOR {Math.round(clip.metadata?.aiRerank?.compositeScore ?? clip.score * 100)}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs space-y-1">
                  {scoreTooltip.map((line) => (
                    <p key={`${clip.id}-${line}`} className="text-xs leading-5">
                      {line}
                    </p>
                  ))}
                </TooltipContent>
              </Tooltip>
              <span className="inline-flex min-w-16 justify-center rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-center text-[10px] font-black text-white backdrop-blur-sm">
                {duration}s
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {visibleBadges.map((badge) => (
                <button
                  key={`${clip.id}-${badge}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleSelection();
                  }}
                  className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[9px] font-bold tracking-wide text-white/90 backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-primary/20"
                >
                  {getBadgeIcon(badge)}
                  <span>{badge}</span>
                </button>
              ))}
              {(clip.metadata?.scoreBreakdown?.topSignals ?? [])
                .slice(0, 2 - visibleBadges.length)
                .map((signal) => (
                  <button
                    key={`${clip.id}-${signal}`}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleSelection();
                    }}
                    className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[9px] font-bold tracking-wide text-white/90 backdrop-blur-sm transition-colors hover:border-primary/30 hover:bg-primary/20"
                  >
                    <Sparkles size={10} className="shrink-0 text-white/70" />
                    <span className="capitalize">{signal.toLowerCase()}</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

interface VideoPreviewPlayerProps {
  readonly sessionId: string;
  readonly clipId: string;
  readonly onStop?: () => void;
}

type PlayerState = 'loading' | 'ready' | 'error';

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

const VideoPreviewPlayer = ({ sessionId, clipId, onStop }: VideoPreviewPlayerProps) => {
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [manualRetryKey, setManualRetryKey] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const urlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: manualRetryKey resets the retry cycle intentionally
  useEffect(() => {
    const controller = new AbortController();
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchPreview = async (attempt: number): Promise<void> => {
      if (controller.signal.aborted) return;

      setPlayerState('loading');
      setAttemptCount(attempt);

      try {
        const response = await authFetch(
          `/api/v1/director/sessions/${sessionId}/clips/${clipId}/preview`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('Content-Type') ?? '';
        if (!contentType.startsWith('video/')) {
          throw new Error(`Unexpected content type: ${contentType}`);
        }

        const blob = await response.blob();
        if (controller.signal.aborted) return;

        if (urlRef.current) {
          URL.revokeObjectURL(urlRef.current);
        }

        const nextUrl = URL.createObjectURL(blob);
        urlRef.current = nextUrl;
        setObjectUrl(nextUrl);
        setPlayerState('ready');
      } catch {
        if (controller.signal.aborted) return;

        if (attempt < MAX_AUTO_RETRIES) {
          retryTimer = setTimeout(() => {
            void fetchPreview(attempt + 1);
          }, RETRY_DELAY_MS);
        } else {
          setPlayerState('error');
        }
      }
    };

    void fetchPreview(1);

    return () => {
      controller.abort();
      if (retryTimer) clearTimeout(retryTimer);
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

  if (playerState === 'loading' || !objectUrl) {
    const statusText =
      attemptCount <= 1
        ? 'Menyiapkan video...'
        : `Mencoba ulang (${attemptCount}/${MAX_AUTO_RETRIES})...`;
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <span className="text-sm font-medium animate-pulse">{statusText}</span>
        {attemptCount > 1 && (
          <p className="max-w-xs text-center text-xs text-muted-foreground">
            Server sedang menyiapkan preview klip ini untuk pertama kali...
          </p>
        )}
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
  } = useDirectorStore();
  const recommendations = useMemo(() => getRecommendedCandidates(candidates), [candidates]);
  const selectedCandidateId = selectedCandidateIds.values().next().value;
  const selectedCandidate = selectedCandidateId
    ? (candidates.find((candidate) => candidate.id === selectedCandidateId) ?? null)
    : null;

  const handleClipSelection = async () => {
    if (!activeSession || selectedCandidateIds.size === 0) return;

    try {
      setLoading(true);
      const res = await authFetch(`/api/v1/director/sessions/${activeSession.id}/clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipIds: Array.from(selectedCandidateIds) }),
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
      <div className="flex flex-col justify-between items-start gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-linear-to-br from-primary via-orange-500 to-rose-600">
            Pilih 1 Video Short Utama
          </h2>
          <p className="text-muted-foreground font-medium">
            Video pilihan anda akan diproses jadi video short lengkap dengan transkip atau subtitle
          </p>
        </div>
        <div className="w-full rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 dark:border-amber-400/25 dark:bg-amber-500/10">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800/90 dark:text-amber-200/90">
                Catatan Preview
              </p>
              <p className="text-xs leading-5 text-amber-800/90 dark:text-amber-100/90">
                Kualitas video pada preview di bawah akan diturunkan untuk mempercepat loading,
                hasil export akhir akan mengikuti kualitas video asli.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-48">
        {activeSession &&
          candidates.map((clip) => (
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

      <div className="sticky bottom-6 z-50 mt-6 animate-in fade-in slide-in-from-bottom-8 duration-500">
        <div className="mx-auto w-full max-w-2xl bg-card/80 backdrop-blur-xl rounded-3xl border border-border/50 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-lg shadow-black/10">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-foreground">
                {selectedCandidate ? '1 Klip Siap Diproses' : 'Belum Ada Klip Dipilih'}
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {selectedCandidate
                  ? `Durasi ${Math.round((selectedCandidate.endMs - selectedCandidate.startMs) / 1000)} detik`
                  : 'Pilih 1 klip untuk lanjut'}
              </span>
            </div>
          </div>
          <Button
            className="rounded-2xl px-8 font-black uppercase tracking-widest text-[11px] sm:self-end"
            variant="default"
            disabled={selectedCandidateIds.size === 0 || isLoading}
            isLoading={isLoading}
            onClick={handleClipSelection}
          >
            Lanjutkan ke Editor
          </Button>
        </div>
      </div>
    </div>
  );
};
