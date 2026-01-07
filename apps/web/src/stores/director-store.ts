import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type DirectorStep =
  | "IMPORT"
  | "ANALYZING"
  | "PICKING"
  | "EDITING"
  | "EXPORTING"
  | "COMPLETED";

export interface DirectorSession {
  id: string;
  step: DirectorStep;
  asset?: {
    id: string;
    origin: "UPLOAD" | "URL_IMPORT";
    sourceUrlNormalized?: string;
    ingestStatus: "UPLOADING" | "READY" | "FAILED";
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
}

export interface SelectedClip {
  id: string;
  candidateId: string;
  orderIndex: number;
  candidate: Candidate;
  transcript?: {
    segments: Array<{ startMs: number; endMs: number; text: string }>;
  };
}

export interface SubtitleStyle {
  fontToken: string;
  fontSize: number;
  textColorToken: string;
  bgColorToken: string;
}

export interface ExportSettings {
  aspectRatio: "9:16" | "16:9" | "1:1";
  quality: "720p" | "1080p";
  includeSubtitles: boolean;
}

export interface RefineSettings {
  faceTracking: boolean;
  removeSilence: boolean;
  stabilize: boolean;
  caption?: string;
}

export interface ExportJob {
  status: string;
  outputUrl?: string | null;
  errorMessage?: string;
  outputStorageKey?: string;
  [key: string]: unknown;
}

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
  transcribeJob: { status: string } | null;
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
  setTranscribeJob: (job: { status: string } | null) => void;
  updateSubtitleStyle: (style: Partial<SubtitleStyle>) => void;
  setRefineSettings: (settings: Record<string, RefineSettings>) => void;
  updateRefineSetting: (
    clipId: string,
    key: keyof RefineSettings,
    value: boolean | string
  ) => void;
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  setExportJob: (job: ExportJob | null) => void;
  setAnalysisLogs: (logs: string[]) => void;
  addAnalysisLog: (log: string) => void;
  setWaitingForAsset: (waiting: boolean) => void;

  reset: () => void;
}

export const useDirectorStore = create<DirectorState>()(
  devtools((set) => ({
    activeSession: null,
    step: "IMPORT",
    isLoading: false,
    error: null,
    isWaitingForAsset: false,
    importUrl: "",
    candidates: [],
    selectedCandidateIds: new Set(),
    selectedClips: [],
    playingClipId: null,
    transcribeJob: null,
    subtitleStyle: {
      fontToken: "F_INTER",
      fontSize: 24,
      textColorToken: "C_WHITE",
      bgColorToken: "C_BLACK",
    },
    refineSettings: {},
    exportSettings: {
      aspectRatio: "9:16",
      quality: "1080p",
      includeSubtitles: true,
    },
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
        const newSet = new Set(state.selectedCandidateIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return { selectedCandidateIds: newSet };
      }),
    setSelectedClips: (clips) => set({ selectedClips: clips }),
    setPlayingClipId: (id) => set({ playingClipId: id }),
    setTranscribeJob: (job) => set({ transcribeJob: job }),
    updateSubtitleStyle: (style) =>
      set((state) => ({ subtitleStyle: { ...state.subtitleStyle, ...style } })),
    setRefineSettings: (settings) => set({ refineSettings: settings }),
    updateRefineSetting: (id, key, value) =>
      set((state) => ({
        refineSettings: {
          ...state.refineSettings,
          [id]: {
            ...(state.refineSettings[id] || {
              faceTracking: true,
              removeSilence: true,
              stabilize: false,
            }),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [key]: value as any, // Cast because conditional types are hard for zustand inference or complex union
          },
        },
      })),
    setExportSettings: (settings) =>
      set((state) => ({
        exportSettings: { ...state.exportSettings, ...settings },
      })),
    setExportJob: (job) => set({ exportJob: job }),
    setAnalysisLogs: (logs) => set({ analysisLogs: logs }),
    addAnalysisLog: (log) =>
      set((state) => ({
        analysisLogs: [...state.analysisLogs.slice(-4), log],
      })),
    setWaitingForAsset: (waiting) => set({ isWaitingForAsset: waiting }),

    reset: () =>
      set({
        activeSession: null,
        step: "IMPORT",
        isLoading: false,
        error: null,
        importUrl: "",
        candidates: [],
        selectedCandidateIds: new Set(),
        selectedClips: [],
        analysisLogs: [],
      }),
  }))
);
