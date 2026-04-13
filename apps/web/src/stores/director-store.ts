import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type DirectorStep =
  | 'IMPORT'
  | 'ANALYZING'
  | 'PICKING'
  | 'EDITING'
  | 'PUBLISH_COPY'
  | 'EXPORTING'
  | 'COMPLETED';

export type TranscribeLanguage = 'id' | 'en' | 'mixed';

export interface DirectorSession {
  id: string;
  step: DirectorStep;
  asset?: {
    id: string;
    origin: 'UPLOAD' | 'URL_IMPORT';
    sourceUrlNormalized?: string;
    ingestStatus: 'UPLOADING' | 'READY' | 'FAILED';
    storageKey: string;
    mimeType?: string;
  };
}

export interface Candidate {
  id: string;
  startMs: number;
  endMs: number;
  score: number;
  rank?: number;
  tags?: string[];
  previewStorageKey?: string;
  metadata?: {
    aiRerank?: {
      provider: 'openai' | 'ollama' | 'heuristic';
      label: string;
      reason: string;
      viralScore: number;
      hookScore: number;
      clarityScore: number;
      heuristicScore: number;
      compositeScore: number;
      contentModeSuggestion:
        | 'podcast'
        | 'interview'
        | 'talking-head'
        | 'product-review'
        | 'cinematic'
        | 'general';
    };
    scoreBreakdown?: {
      energy: number;
      dialogDensity: number;
      durationFit: number;
      visualPenalty: number;
      topSignals: string[];
      badges: string[];
      contentModeSuggestion:
        | 'podcast'
        | 'interview'
        | 'talking-head'
        | 'product-review'
        | 'cinematic'
        | 'general';
    };
  };
}

export interface SelectedClip {
  id: string;
  candidateId: string;
  orderIndex: number;
  trimStartMs?: number | null;
  trimEndMs?: number | null;
  candidate: Candidate;
  transcript?: {
    segments: Array<{
      startMs: number;
      endMs: number;
      text: string;
      speaker?: string;
      words?: Array<{
        startMs: number;
        endMs: number;
        text: string;
        speaker?: string;
      }>;
    }>;
  };
}

export interface TranscribeJob {
  status: string;
  language?: TranscribeLanguage;
  errorMessage?: string | null;
  progressMeta?: {
    phase?:
      | 'queued'
      | 'queueing-clips'
      | 'extracting-audio'
      | 'running-whisper'
      | 'saving-transcript'
      | 'cache-hit'
      | 'processing-clips'
      | 'completed'
      | 'failed';
    clipCount?: number;
    clipDurationTotalMs?: number;
    completedClipCount?: number;
    failedClipCount?: number;
    cacheHitCount?: number;
    currentClipId?: string | null;
  } | null;
}

export interface SubtitleStyle {
  fontToken: string;
  fontSize: number;
  textColorToken: string;
  bgColorToken: string;
  position: 'top' | 'center' | 'bottom' | 'cinema-bottom' | 'safe-bottom' | 'lower-third';
  animation: 'none' | 'fade' | 'typewriter' | 'phrase' | 'line';
}

export interface ExportSettings {
  aspectRatio: '9:16' | '16:9' | '1:1';
  quality: '720p' | '1080p';
  includeSubtitles: boolean;
  normalizeAudio: boolean;
}

export interface RefineSettings {
  faceTracking?: boolean;
  removeSilence?: boolean;
  optimizeHook?: boolean;
  stabilize?: boolean;
  contentMode:
    | 'auto'
    | 'podcast'
    | 'interview'
    | 'talking-head'
    | 'product-review'
    | 'cinematic'
    | 'general';
  caption?: string;
}

export interface ExportJob {
  status: string;
  progress?: number;
  outputUrl?: string | null;
  errorMessage?: string;
  outputStorageKey?: string;
  [key: string]: unknown;
}

const defaultSubtitleStyle: SubtitleStyle = {
  fontToken: 'F_INTER',
  fontSize: 24,
  textColorToken: 'C_WHITE',
  bgColorToken: 'C_BLACK',
  position: 'bottom',
  animation: 'none',
};

const defaultExportSettings: ExportSettings = {
  aspectRatio: '9:16',
  quality: '1080p',
  includeSubtitles: true,
  normalizeAudio: true,
};

interface DirectorState {
  // Session
  activeSession: DirectorSession | null;
  step: DirectorStep;
  isLoading: boolean;
  error: string | null;
  isWaitingForAsset: boolean;

  // Data
  importUrl: string;
  candidates: Candidate[];
  selectedCandidateIds: Set<string>;
  selectedClips: SelectedClip[];

  // Editing
  playingClipId: string | null;
  transcribeJob: TranscribeJob | null;
  transcribeLanguage: TranscribeLanguage;
  subtitleStyle: SubtitleStyle;

  // Settings
  refineSettings: Record<string, RefineSettings>;

  // Export
  exportSettings: ExportSettings;
  exportJob: ExportJob | null;
  downloadProgress: number;
  analysisLogs: string[];

  // Actions
  setSession: (session: DirectorSession | null) => void;
  setStep: (step: DirectorStep) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setImportUrl: (url: string) => void;
  setCandidates: (candidates: Candidate[]) => void;
  toggleCandidateSelection: (id: string) => void;
  setSelectedClips: (clips: SelectedClip[]) => void;
  setPlayingClipId: (id: string | null) => void;
  setTranscribeJob: (job: TranscribeJob | null) => void;
  setTranscribeLanguage: (language: TranscribeLanguage) => void;
  updateSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  setRefineSettings: (settings: Record<string, RefineSettings>) => void;
  updateRefineSetting: (clipId: string, key: keyof RefineSettings, value: boolean | string) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setExportJob: (job: ExportJob | null) => void;
  setDownloadProgress: (progress: number) => void;
  setAnalysisLogs: (logs: string[]) => void;
  addAnalysisLog: (log: string) => void;
  setWaitingForAsset: (waiting: boolean) => void;

  reset: () => void;
}

export const useDirectorStore = create<DirectorState>()(
  devtools((set) => ({
    activeSession: null,
    step: 'IMPORT',
    isLoading: false,
    error: null,
    isWaitingForAsset: false,
    importUrl: '',
    candidates: [],
    selectedCandidateIds: new Set(),
    selectedClips: [],
    playingClipId: null,
    transcribeJob: null,
    transcribeLanguage: 'mixed',
    subtitleStyle: defaultSubtitleStyle,
    refineSettings: {},
    exportSettings: defaultExportSettings,
    exportJob: null,
    downloadProgress: 0,
    analysisLogs: [],

    setSession: (session) => set({ activeSession: session }),
    setStep: (step) => set({ step }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setImportUrl: (url) => set({ importUrl: url }),
    setCandidates: (candidates) => set({ candidates }),
    toggleCandidateSelection: (id) =>
      set((state) => {
        const isAlreadySelected = state.selectedCandidateIds.has(id);
        const newSet = isAlreadySelected ? new Set<string>() : new Set([id]);
        return { selectedCandidateIds: newSet };
      }),
    setSelectedClips: (clips) => set({ selectedClips: clips }),
    setPlayingClipId: (id) => set({ playingClipId: id }),
    setTranscribeJob: (job) => set({ transcribeJob: job }),
    setTranscribeLanguage: (language) => set({ transcribeLanguage: language }),
    updateSubtitleStyle: (style) =>
      set((state) => ({ subtitleStyle: { ...state.subtitleStyle, ...style } })),
    setRefineSettings: (settings) => set({ refineSettings: settings }),
    updateRefineSetting: (id, key, value) =>
      set((state) => ({
        refineSettings: {
          ...state.refineSettings,
          [id]: {
            ...(state.refineSettings[id] || {
              contentMode: 'auto',
            }),
            [key]: value as RefineSettings[keyof RefineSettings],
          },
        },
      })),
    setExportSettings: (settings) =>
      set((state) => ({
        exportSettings: { ...state.exportSettings, ...settings },
      })),
    setExportJob: (job) => set({ exportJob: job }),
    setDownloadProgress: (progress) => set({ downloadProgress: progress }),
    setAnalysisLogs: (logs) => set({ analysisLogs: logs }),
    addAnalysisLog: (log) =>
      set((state) => ({
        analysisLogs: [...state.analysisLogs.slice(-4), log],
      })),
    setWaitingForAsset: (waiting) => set({ isWaitingForAsset: waiting }),

    reset: () =>
      set({
        activeSession: null,
        step: 'IMPORT',
        isLoading: false,
        error: null,
        isWaitingForAsset: false,
        importUrl: '',
        candidates: [],
        selectedCandidateIds: new Set(),
        selectedClips: [],
        playingClipId: null,
        transcribeJob: null,
        transcribeLanguage: 'mixed',
        subtitleStyle: defaultSubtitleStyle,
        refineSettings: {},
        exportSettings: defaultExportSettings,
        exportJob: null,
        downloadProgress: 0,
        analysisLogs: [],
      }),
  })),
);
