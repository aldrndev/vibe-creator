import { Check, FileVideo, Loader2, Pause, Play, RefreshCcw, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyTranscriptCueEdit,
  applyTranscriptCueSpeaker,
  buildTranscriptSpeakerOptions,
  formatSrtRange,
  type TranscriptCue,
  type TranscriptSegment,
} from '@/components/director/steps/editing-transcript-cues';
import {
  buildStableTranscriptEditorCues,
  getSubtitlePresetBadgeLabel,
} from '@/components/director/steps/editing-transcript-editor-view';
import { Badge, Button } from '@/components/ui';
import { useAuthenticatedObjectUrl } from '@/hooks/use-authenticated-object-url';
import { directorSubtitleColorOptions } from '@/lib/director-subtitle-colors';
import {
  COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS,
  formatTranscribeLanguageLabel,
} from '@/lib/transcribe-language';
import { cn } from '@/lib/utils';
import { authFetch } from '@/services/api';
import type { SelectedClip, SubtitleStyle } from '@/stores/director-store';
import { useDirectorStore } from '@/stores/director-store';

export interface SelectedClipCardProps {
  readonly sessionId: string;
  readonly clip: SelectedClip;
  readonly index: number;
  readonly onRemoveClip: (clipId: string) => void;
  readonly onUpdateTranscript: (clipId: string, segments: TranscriptSegment[]) => void;
  readonly subtitleStyle: SubtitleStyle;
  readonly transcriptSaveState?: 'idle' | 'saving' | 'saved' | 'error';
  readonly onRetryTranscriptSave?: () => void;
  readonly isTranscribing?: boolean;
}

const defaultTranscriptSpeakerStyles: SubtitleStyle['speakerStyles'] = [
  {
    speaker: 'Penanya',
    label: 'Penanya',
    textColorToken: 'C_CYAN',
    bgColorToken: 'BG_TRANSPARENT',
  },
  {
    speaker: 'Penjawab',
    label: 'Penjawab',
    textColorToken: 'C_YELLOW',
    bgColorToken: 'BG_TRANSPARENT',
  },
];

type ClipPreviewState = 'idle' | 'queued' | 'processing' | 'loading-file' | 'ready' | 'error';
type ClipPreviewJobStatus = 'READY' | 'QUEUED' | 'PROCESSING' | 'FAILED';

interface ClipPreviewJobData {
  readonly status: ClipPreviewJobStatus;
  readonly previewUrl?: string;
  readonly progress?: number;
}

function parseClipPreviewJobData(payload: unknown): ClipPreviewJobData | null {
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
  };
}

async function readClipPreviewJobData(
  url: string,
  init?: RequestInit,
): Promise<ClipPreviewJobData> {
  const response = await authFetch(url, init);
  if (!response.ok && response.status !== 202) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = parseClipPreviewJobData(await response.json());
  if (!data) {
    throw new Error('Invalid clip preview response');
  }

  return data;
}

async function fetchClipPreviewBlob(previewUrl: string, signal: AbortSignal): Promise<Blob> {
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

function getTranscriptSpeakerSwatchClass(
  speaker: string | undefined,
  subtitleStyle: SubtitleStyle,
) {
  const speakerStyles = subtitleStyle.speakerStyles.length
    ? subtitleStyle.speakerStyles
    : defaultTranscriptSpeakerStyles;
  const speakerStyle = speakerStyles.find((style) => style.speaker === speaker);
  const colorOption = directorSubtitleColorOptions.find(
    (color) => color.value === speakerStyle?.textColorToken,
  );

  return colorOption?.swatchClass ?? 'bg-white border-border/70';
}

function getPreviewButtonIcon(isPreviewLoading: boolean, isPlaying: boolean) {
  if (isPreviewLoading) {
    return <Loader2 size={14} className="animate-spin" />;
  }

  if (isPlaying) {
    return <Pause size={14} className="fill-white" />;
  }

  return <Play size={14} className="fill-white" />;
}

function TranscriptSaveStatusBadge({
  state,
  onRetry,
}: Readonly<{
  state: 'idle' | 'saving' | 'saved' | 'error';
  onRetry?: () => void;
}>) {
  if (state === 'idle') {
    return <span aria-hidden="true" className="inline-flex h-6 w-0 shrink-0 sm:w-24" />;
  }

  if (state === 'saved') {
    return (
      <span className="inline-flex h-6 min-w-0 shrink-0 items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 sm:w-24 sm:justify-center">
        Tersimpan
      </span>
    );
  }

  if (state === 'error') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="h-6 shrink-0 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 text-[10px] font-black uppercase tracking-wider text-rose-400 transition-colors hover:bg-rose-500/15 sm:w-24"
      >
        Gagal
      </button>
    );
  }

  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-primary/25 bg-primary/10 px-2.5 text-[10px] font-black uppercase tracking-wider text-primary sm:w-24 sm:justify-center">
      Menyimpan...
    </span>
  );
}

function ClipPreviewMedia({
  candidateId,
  index,
  isPlaying,
  posterUrl,
  previewVideoUrl,
  setIsLandscape,
  setIsPlaying,
}: {
  candidateId: string;
  index: number;
  isPlaying: boolean;
  posterUrl: string | null;
  previewVideoUrl: string | null;
  setIsLandscape: (landscape: boolean) => void;
  setIsPlaying: (playing: boolean) => void;
}) {
  if (isPlaying && previewVideoUrl) {
    return (
      <video
        key={`${candidateId}-preview`}
        src={previewVideoUrl}
        autoPlay
        playsInline
        controls
        className="w-full h-full object-contain bg-black"
        onLoadedMetadata={(event) => {
          setIsLandscape(event.currentTarget.videoWidth > event.currentTarget.videoHeight);
        }}
        onEnded={() => {
          setIsPlaying(false);
        }}
      >
        <track kind="captions" srcLang="id" label="Preview clip tanpa caption" />
      </video>
    );
  }

  if (posterUrl) {
    return (
      <img
        src={posterUrl}
        alt={`Preview clip ${index + 1}`}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-contain bg-black opacity-90 group-hover:opacity-100 transition-opacity"
        onLoad={(event) => {
          setIsLandscape(event.currentTarget.naturalWidth > event.currentTarget.naturalHeight);
        }}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
      <FileVideo size={32} strokeWidth={1.5} />
    </div>
  );
}

function TranscriptCueEditorItem({
  cue,
  cueIndex,
  showSpeakerControls,
  selectedCueIds,
  handleToggleCueSelection,
  subtitleStyle,
  speakerOptions,
  handleAssignCueSpeaker,
  transcriptSegments,
  handleUpdateTranscriptSegments,
}: {
  cue: TranscriptCue;
  cueIndex: number;
  showSpeakerControls: boolean;
  selectedCueIds: Set<string>;
  handleToggleCueSelection: (cueId: string, checked: boolean) => void;
  subtitleStyle: SubtitleStyle;
  speakerOptions: { label: string; value: string }[];
  handleAssignCueSpeaker: (cueId: string, speaker: string) => void;
  transcriptSegments: TranscriptSegment[];
  handleUpdateTranscriptSegments: (segments: TranscriptSegment[]) => void;
}) {
  const resizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${Math.max(element.scrollHeight, 56)}px`;
  };

  return (
    <div className="rounded-2xl border border-border/35 bg-muted/20 px-2.5 py-2.5 sm:px-3">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {showSpeakerControls ? (
          <label className="flex min-w-0 items-center gap-2">
            <input
              type="checkbox"
              checked={selectedCueIds.has(cue.id)}
              onChange={(event) => handleToggleCueSelection(cue.id, event.currentTarget.checked)}
              className="peer sr-only"
              aria-label={`Pilih baris ${cueIndex + 1}`}
            />
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border/60 bg-card/70 text-white transition-all peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500/35">
              <Check
                size={13}
                strokeWidth={3}
                className={cn(
                  'transition-opacity',
                  selectedCueIds.has(cue.id) ? 'opacity-100' : 'opacity-0',
                )}
              />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/55">
              Baris {cueIndex + 1}
            </span>
          </label>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/55">
            Baris {cueIndex + 1}
          </span>
        )}
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
          {showSpeakerControls ? (
            <div className="flex min-w-0 items-center gap-1.5">
              {cue.speaker ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-2.5 w-2.5 rounded-full border',
                    getTranscriptSpeakerSwatchClass(cue.speaker, subtitleStyle),
                  )}
                />
              ) : null}
              <select
                value={cue.speaker ?? ''}
                onChange={(event) => handleAssignCueSpeaker(cue.id, event.target.value)}
                className="h-7 min-w-28 rounded-xl border border-border/40 bg-card/50 px-2 text-[10px] font-bold text-foreground outline-none transition-all focus:border-orange-500/40"
                aria-label={`Speaker baris ${cueIndex + 1}`}
              >
                <option value="" disabled>
                  Pembicara
                </option>
                {speakerOptions.map((speaker) => (
                  <option key={speaker.value} value={speaker.value}>
                    {speaker.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <span className="text-[10px] font-semibold text-muted-foreground/70 tabular-nums">
            {formatSrtRange(cue.startMs, cue.endMs)}
          </span>
        </div>
      </div>
      <textarea
        className="w-full resize-none rounded-xl border border-border/35 bg-card/35 px-3 py-2 text-sm leading-relaxed text-foreground/85 shadow-sm transition-all hover:bg-card/55 focus:border-primary/50 focus:bg-card focus:outline-none focus:ring-1 focus:ring-primary/20"
        rows={1}
        defaultValue={cue.text}
        onBlur={(e) => {
          const value = e.target.value;
          if (!transcriptSegments.length || value.trim() === cue.text.trim()) return;
          const updated = applyTranscriptCueEdit({
            segments: transcriptSegments as TranscriptSegment[],
            cue,
            nextText: value,
          });

          handleUpdateTranscriptSegments(updated);
        }}
        onInput={(e) => {
          resizeTextarea(e.currentTarget);
        }}
        onFocus={(e) => {
          resizeTextarea(e.currentTarget);
        }}
      />
    </div>
  );
}

function TranscriptSpeakerPanel({
  selectedCueCount,
  speakerChips,
  speakerOptions,
  handleAssignSelectedSpeaker,
}: {
  selectedCueCount: number;
  speakerChips: Array<{ label: string; value: string; swatchClass: string }>;
  speakerOptions: Array<{ label: string; value: string }>;
  handleAssignSelectedSpeaker: (speaker: string) => void;
}) {
  return (
    <div className="mb-3 shrink-0 rounded-2xl border border-border/35 bg-muted/15 p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
          <UsersRound size={12} />
          Pembicara
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground">
          {selectedCueCount} dipilih
        </span>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-1.5">
        {speakerChips.map((speaker) => (
          <span
            key={`chip-${speaker.value}`}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-xl border border-border/35 bg-card/35 px-2 py-1 text-[10px] font-bold text-muted-foreground"
          >
            <span
              aria-hidden="true"
              className={cn('h-2.5 w-2.5 rounded-full border', speaker.swatchClass)}
            />
            <span className="truncate">{speaker.label}</span>
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {speakerOptions.map((speaker) => (
          <button
            type="button"
            key={speaker.value}
            disabled={selectedCueCount === 0}
            onClick={() => handleAssignSelectedSpeaker(speaker.value)}
            className="rounded-xl border border-border/40 bg-card/35 px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground transition-all enabled:hover:border-orange-500/35 enabled:hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Set {speaker.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function useTranscriptEditor(
  clip: SelectedClip,
  subtitleStyle: SubtitleStyle,
  onUpdateTranscript: (clipId: string, newTranscript: TranscriptSegment[]) => void,
) {
  const [selectedCueIds, setSelectedCueIds] = useState<Set<string>>(() => new Set());

  const transcriptSegments = clip.transcript?.segments ?? [];
  const transcriptCues = useMemo(
    () => buildStableTranscriptEditorCues(transcriptSegments as TranscriptSegment[]),
    [transcriptSegments],
  );

  const showSpeakerControls =
    subtitleStyle.speakerMode === 'speaker-colors' || subtitleStyle.stylePreset === 'podcast-duo';

  const speakerOptions = useMemo(
    () => buildTranscriptSpeakerOptions(transcriptSegments as TranscriptSegment[]),
    [transcriptSegments],
  );

  const speakerChips = useMemo(
    () =>
      speakerOptions.map((speaker) => ({
        ...speaker,
        swatchClass: getTranscriptSpeakerSwatchClass(speaker.value, subtitleStyle),
      })),
    [speakerOptions, subtitleStyle],
  );

  const hasTranscriptCues = transcriptCues.length > 0;
  const selectedCueCount = selectedCueIds.size;

  useEffect(() => {
    if (!showSpeakerControls) {
      setSelectedCueIds((current) => (current.size ? new Set() : current));
    }
  }, [showSpeakerControls]);

  useEffect(() => {
    const cueIds = new Set(transcriptCues.map((cue) => cue.id));
    setSelectedCueIds((current) => {
      const next = new Set([...current].filter((cueId) => cueIds.has(cueId)));
      return next.size === current.size ? current : next;
    });
  }, [transcriptCues]);

  const handleUpdateTranscriptSegments = useCallback(
    (segments: TranscriptSegment[]) => {
      onUpdateTranscript(clip.id, segments);
    },
    [clip.id, onUpdateTranscript],
  );

  const handleToggleCueSelection = useCallback((cueId: string, checked: boolean) => {
    setSelectedCueIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(cueId);
      } else {
        next.delete(cueId);
      }
      return next;
    });
  }, []);

  const handleAssignCueSpeaker = useCallback(
    (cueId: string, speaker: string) => {
      const cue = transcriptCues.find((candidate) => candidate.id === cueId);
      if (!cue || !transcriptSegments.length) {
        return;
      }

      const updated = applyTranscriptCueSpeaker({
        segments: transcriptSegments as TranscriptSegment[],
        cue,
        speaker,
      });
      handleUpdateTranscriptSegments(updated);
    },
    [transcriptCues, transcriptSegments, handleUpdateTranscriptSegments],
  );

  const handleAssignSelectedSpeaker = useCallback(
    (speaker: string) => {
      if (!selectedCueIds.size || !transcriptSegments.length) {
        return;
      }

      const selectedCues = transcriptCues.filter((cue) => selectedCueIds.has(cue.id));
      const updated = selectedCues.reduce(
        (segments, cue) => applyTranscriptCueSpeaker({ segments, cue, speaker }),
        transcriptSegments as TranscriptSegment[],
      );
      handleUpdateTranscriptSegments(updated);
      setSelectedCueIds(new Set());
    },
    [selectedCueIds, transcriptCues, transcriptSegments, handleUpdateTranscriptSegments],
  );

  return {
    transcriptSegments,
    transcriptCues,
    showSpeakerControls,
    speakerOptions,
    speakerChips,
    hasTranscriptCues,
    selectedCueCount,
    selectedCueIds,
    handleUpdateTranscriptSegments,
    handleToggleCueSelection,
    handleAssignCueSpeaker,
    handleAssignSelectedSpeaker,
  };
}

/**
 * Render one ready-to-edit short with transcript editing controls.
 */
function useClipPreview(sessionId: string, candidateId: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<ClipPreviewState>('idle');
  const [previewProgress, setPreviewProgress] = useState<number | null>(null);
  const [previewRequestKey, setPreviewRequestKey] = useState(0);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!candidateId) {
      return;
    }

    setIsPlaying(false);
    setPreviewState('idle');
    setPreviewProgress(null);
    setPreviewRequestKey(0);
    setPreviewVideoUrl(null);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, [candidateId]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (previewRequestKey === 0 || previewVideoUrl) {
      return;
    }

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const markPreviewError = () => {
      if (!controller.signal.aborted) {
        setPreviewState('error');
      }
    };

    const scheduleStatusPoll = () => {
      timer = setTimeout(() => {
        void pollPreviewStatus().catch(markPreviewError);
      }, 1400);
    };

    const installPreviewBlob = (blob: Blob) => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(blob);
      previewUrlRef.current = objectUrl;
      setPreviewVideoUrl(objectUrl);
      setPreviewState('ready');
      setIsPlaying(true);
    };

    const handlePreviewJob = async (data: ClipPreviewJobData) => {
      setPreviewProgress(data.progress ?? null);

      if (data.status === 'READY' && data.previewUrl) {
        await loadPreviewFile(data.previewUrl);
        return;
      }

      if (data.status === 'FAILED') {
        setPreviewState('error');
        return;
      }

      setPreviewState(data.status === 'PROCESSING' ? 'processing' : 'queued');
      scheduleStatusPoll();
    };

    const loadPreviewFile = async (previewUrl: string) => {
      setPreviewState('loading-file');
      const blob = await fetchClipPreviewBlob(previewUrl, controller.signal);
      if (controller.signal.aborted) {
        return;
      }

      installPreviewBlob(blob);
    };

    const pollPreviewStatus = async () => {
      const data = await readClipPreviewJobData(
        `/api/v1/director/sessions/${sessionId}/clips/${candidateId}/preview/status`,
        { signal: controller.signal },
      );
      await handlePreviewJob(data);
    };

    const requestPreview = async () => {
      setPreviewState('queued');
      setPreviewProgress(null);
      const data = await readClipPreviewJobData(
        `/api/v1/director/sessions/${sessionId}/clips/${candidateId}/preview`,
        {
          method: 'POST',
          signal: controller.signal,
        },
      );
      await handlePreviewJob(data);
    };

    void requestPreview().catch(() => {
      markPreviewError();
    });

    return () => {
      controller.abort();
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [candidateId, previewRequestKey, previewVideoUrl, sessionId]);

  return {
    isPlaying,
    setIsPlaying,
    previewVideoUrl,
    previewState,
    previewProgress,
    previewRequestKey,
    setPreviewRequestKey,
  };
}

export function SelectedClipCard({
  sessionId,
  clip,
  index,
  onRemoveClip,
  onUpdateTranscript,
  subtitleStyle,
  transcriptSaveState = 'idle',
  onRetryTranscriptSave,
  isTranscribing,
}: Readonly<SelectedClipCardProps>) {
  const [isLandscape, setIsLandscape] = useState(false);
  const candidateId = clip.candidate.id;

  const {
    isPlaying,
    setIsPlaying,
    previewVideoUrl,
    previewState,
    previewProgress,
    setPreviewRequestKey,
  } = useClipPreview(sessionId, candidateId);
  const posterUrl = useAuthenticatedObjectUrl(
    `/api/v1/director/sessions/${sessionId}/clips/${candidateId}/poster`,
  );
  const duration = Math.round((clip.candidate.endMs - clip.candidate.startMs) / 1000);
  const aspectClass = isLandscape ? 'aspect-video' : 'aspect-9/16';
  const previewMaxWidthClass = isLandscape
    ? 'max-w-[24rem] sm:max-w-[34rem] lg:max-w-[40rem]'
    : 'max-w-[20rem] sm:max-w-[24rem]';
  const isPreviewLoading =
    previewState === 'queued' || previewState === 'processing' || previewState === 'loading-file';
  const previewLabel = isPlaying
    ? `Hentikan preview clip ${index + 1}`
    : `Putar preview clip ${index + 1}`;
  const transcriptPresetBadgeLabel = getSubtitlePresetBadgeLabel(subtitleStyle.stylePreset);
  const {
    transcriptSegments,
    transcriptCues,
    showSpeakerControls,
    speakerOptions,
    speakerChips,
    hasTranscriptCues,
    selectedCueCount,
    selectedCueIds,
    handleUpdateTranscriptSegments,
    handleToggleCueSelection,
    handleAssignCueSpeaker,
    handleAssignSelectedSpeaker,
  } = useTranscriptEditor(clip, subtitleStyle, onUpdateTranscript);

  const { subtitleMode, subtitleTargetLanguage, transcribeLanguage } = useDirectorStore();

  const languageBadgeLabel = useMemo(() => {
    if (subtitleMode === 'original') {
      if (!transcribeLanguage || transcribeLanguage === 'mixed') {
        return 'Bahasa Asli';
      }
      return formatTranscribeLanguageLabel(transcribeLanguage);
    }
    const targetOption = COMMON_SUBTITLE_TARGET_LANGUAGE_OPTIONS.find(
      (opt) => opt.value === subtitleTargetLanguage,
    );
    return targetOption?.label ?? subtitleTargetLanguage ?? 'English';
  }, [subtitleMode, transcribeLanguage, subtitleTargetLanguage]);

  return (
    <div className="relative z-10 flex flex-col gap-5">
      <div className="w-full flex justify-center">
        <div
          className={`w-full ${previewMaxWidthClass} ${aspectClass} bg-black rounded-2xl overflow-hidden relative border border-border/50 shrink-0 shadow-sm`}
        >
          <ClipPreviewMedia
            candidateId={candidateId}
            index={index}
            isPlaying={isPlaying}
            posterUrl={posterUrl}
            previewVideoUrl={previewVideoUrl}
            setIsLandscape={setIsLandscape}
            setIsPlaying={setIsPlaying}
          />
          <button
            type="button"
            onClick={() => {
              if (isPreviewLoading) {
                return;
              }

              if (isPlaying) {
                setIsPlaying(false);
                return;
              }

              if (previewVideoUrl) {
                setIsPlaying(true);
                return;
              }

              setPreviewRequestKey((current) => current + 1);
            }}
            disabled={isPreviewLoading}
            className="absolute top-3 left-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-white backdrop-blur-md transition-all hover:bg-black/60"
            aria-label={previewLabel}
          >
            {getPreviewButtonIcon(isPreviewLoading, isPlaying)}
          </button>
          {isPreviewLoading ? (
            <div className="absolute inset-x-3 top-12 z-10 rounded-xl border border-white/10 bg-black/55 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white/85 backdrop-blur-md">
              {previewState === 'loading-file' ? 'Memuat preview' : 'Menyiapkan preview'}
              {typeof previewProgress === 'number' ? ` ${Math.round(previewProgress)}%` : ''}
            </div>
          ) : null}
          {previewState === 'error' ? (
            <div className="absolute inset-x-3 top-12 z-10 rounded-xl border border-destructive/35 bg-destructive/20 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
              Preview belum siap
            </div>
          ) : null}
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <span className="text-[10px] font-black tracking-widest px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 uppercase">
              {duration}s
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-2 ml-1 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 sm:mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Transkrip
                </span>
                <Badge
                  variant="outline"
                  className="shrink-0 h-5 border rounded-full px-2 text-[9px] font-black uppercase tracking-wider border-blue-500/30 bg-blue-500/5 text-blue-400"
                >
                  {languageBadgeLabel}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs font-medium leading-5 text-muted-foreground">
                Ubah teks subtitle jika belum sesuai di bawah.
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 sm:flex sm:justify-end">
              <div className="flex min-w-0 items-center gap-1.5">
                <TranscriptSaveStatusBadge
                  state={transcriptSaveState}
                  onRetry={onRetryTranscriptSave}
                />
                <Badge
                  variant="outline"
                  className="h-6 min-w-0 max-w-44 justify-start truncate whitespace-nowrap border-orange-500/30 bg-orange-500/5 px-2.5 text-[10px] font-black uppercase tracking-wider text-orange-500 sm:max-w-40"
                >
                  {transcriptPresetBadgeLabel}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="col-start-2 row-start-1 h-8 shrink-0 rounded-xl px-2 text-xs font-black text-muted-foreground hover:text-foreground sm:col-auto sm:row-auto sm:px-2.5"
                aria-label={`Ganti clip ${index + 1}`}
                onClick={() => onRemoveClip(clip.id)}
              >
                <RefreshCcw size={14} />
                Ganti
              </Button>
            </div>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 block ml-1 sr-only">
            Transkrip
          </div>
          <div className="relative">
            {isTranscribing && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/50 backdrop-blur-[2px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-bold text-muted-foreground">
                  Memproses transkrip...
                </span>
              </div>
            )}
            <div
              className={cn(
                'flex max-h-108 flex-col pr-1',
                isTranscribing ? 'overflow-hidden' : 'overflow-y-auto',
              )}
            >
              {hasTranscriptCues && showSpeakerControls ? (
                <TranscriptSpeakerPanel
                  selectedCueCount={selectedCueCount}
                  speakerChips={speakerChips}
                  speakerOptions={speakerOptions}
                  handleAssignSelectedSpeaker={handleAssignSelectedSpeaker}
                />
              ) : null}
              <div className="flex flex-col gap-2.5">
                {hasTranscriptCues ? (
                  transcriptCues.map((cue, cueIndex) => (
                    <TranscriptCueEditorItem
                      key={`${clip.id}-${cue.id}-${cue.text}`}
                      cue={cue as TranscriptCue}
                      cueIndex={cueIndex}
                      showSpeakerControls={showSpeakerControls}
                      selectedCueIds={selectedCueIds}
                      handleToggleCueSelection={handleToggleCueSelection}
                      subtitleStyle={subtitleStyle}
                      speakerOptions={speakerOptions}
                      handleAssignCueSpeaker={handleAssignCueSpeaker}
                      transcriptSegments={transcriptSegments as TranscriptSegment[]}
                      handleUpdateTranscriptSegments={handleUpdateTranscriptSegments}
                    />
                  ))
                ) : (
                  <div className="w-full bg-muted/50 border border-border/50 rounded-2xl p-4 text-sm text-muted-foreground/50 text-center italic min-h-24 flex items-center justify-center">
                    Subtitle akan muncul setelah transkripsi selesai.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
