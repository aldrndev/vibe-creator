import { create } from 'zustand';
import type { 
  TimelineTrack, 
  TimelineClip, 
  TrackType, 
  ClipTransforms, 
  ClipEffects,
  ProjectSettings,
  TextOverlay
} from '@vibe-creator/shared';

// Default values
const DEFAULT_TRANSFORMS: ClipTransforms = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
};

const DEFAULT_EFFECTS: ClipEffects = {
  filters: [],
  speed: 1,
  volume: 1,
  fadeIn: 0,
  fadeOut: 0,
};

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  width: 1920,
  height: 1080,
  fps: 30,
  maxDurationMs: 1800000, // 30 minutes
};

// Editor-specific types
export interface EditorAsset {
  id: string;
  name: string;
  type: 'VIDEO' | 'AUDIO' | 'IMAGE';
  url: string; // Blob URL or presigned URL
  file?: File; // Original file for FFmpeg processing
  durationMs?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  thumbnails?: string[]; // Timeline thumbnail strips
}

export interface EditorTimeline {
  durationMs: number;
  tracks: EditorTrack[];
}

export interface EditorTrack extends Omit<TimelineTrack, 'timelineId'> {
  clips: EditorClip[];
}

export interface EditorClip extends Omit<TimelineClip, 'trackId'> {
  asset?: EditorAsset;
}

export interface ExportSettings {
  format: 'mp4';
  resolution: '720p' | '1080p' | '4k';
  quality: 'low' | 'medium' | 'high';
  watermark: boolean;
}

interface EditorState {
  // Project info
  projectId: string | null;
  projectTitle: string;
  projectSettings: ProjectSettings;
  isDirty: boolean;
  
  // Timeline state
  timeline: EditorTimeline;
  
  // Assets
  assets: EditorAsset[];
  
  // Selection
  selectedTrackId: string | null;
  selectedClipId: string | null;
  
  // Playback
  currentTimeMs: number;
  isPlaying: boolean;
  
  // Zoom & scroll
  zoomLevel: number; // pixels per second
  scrollLeft: number;
  
  // Export
  exportSettings: ExportSettings;
  isExporting: boolean;
  
  // Text overlays
  textOverlays: TextOverlay[];
  selectedTextOverlayId: string | null;
  
  // Actions
  initProject: (projectId: string, title: string, settings?: Partial<ProjectSettings>) => void;
  resetEditor: () => void;
  
  // Asset actions
  addAsset: (asset: EditorAsset) => void;
  updateAsset: (assetId: string, updates: Partial<EditorAsset>) => void;
  removeAsset: (assetId: string) => void;
  
  // Track actions
  addTrack: (type: TrackType) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<EditorTrack>) => void;
  
  // Clip actions
  addClip: (trackId: string, clip: Omit<EditorClip, 'id'>) => string;
  removeClip: (trackId: string, clipId: string) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<EditorClip>) => void;
  moveClip: (fromTrackId: string, toTrackId: string, clipId: string, newStartMs: number) => void;
  
  // Selection actions
  selectTrack: (trackId: string | null) => void;
  selectClip: (clipId: string | null) => void;
  
  // Playback actions
  setCurrentTime: (timeMs: number) => void;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  
  // Zoom actions
  setZoomLevel: (level: number) => void;
  setScrollLeft: (scroll: number) => void;
  
  // Timeline actions
  recalculateDuration: () => void;
  
  // Export actions
  setExportSettings: (settings: Partial<ExportSettings>) => void;
  getExportPayload: () => { projectId: string; timeline: EditorTimeline; export: ExportSettings } | null;
  
  // Text overlay actions
  addTextOverlay: (overlay: Omit<TextOverlay, 'id'>) => string;
  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  removeTextOverlay: (id: string) => void;
  selectTextOverlay: (id: string | null) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const initialTimeline: EditorTimeline = {
  durationMs: 0,
  tracks: [
    {
      id: 'track-video-1',
      type: 'VIDEO',
      order: 0,
      muted: false,
      volume: 1,
      locked: false,
      clips: [],
    },
    {
      id: 'track-audio-1',
      type: 'AUDIO',
      order: 1,
      muted: false,
      volume: 1,
      locked: false,
      clips: [],
    },
  ],
};

export const useEditorStore = create<EditorState>()((set, get) => ({
  // Initial state
  projectId: null,
  projectTitle: 'Untitled Project',
  projectSettings: DEFAULT_PROJECT_SETTINGS,
  isDirty: false,
  
  timeline: initialTimeline,
  assets: [],
  
  selectedTrackId: null,
  selectedClipId: null,
  
  currentTimeMs: 0,
  isPlaying: false,
  
  zoomLevel: 100, // 100px per second
  scrollLeft: 0,
  
  exportSettings: {
    format: 'mp4',
    resolution: '1080p',
    quality: 'high',
    watermark: true, // Free tier default
  },
  isExporting: false,
  
  // Text overlays
  textOverlays: [],
  selectedTextOverlayId: null,
  
  // Actions
  initProject: (projectId, title, settings) => {
    set({
      projectId,
      projectTitle: title,
      projectSettings: { ...DEFAULT_PROJECT_SETTINGS, ...settings },
      isDirty: false,
      timeline: { ...initialTimeline, tracks: initialTimeline.tracks.map(t => ({ ...t, clips: [] })) },
      assets: [],
      selectedTrackId: null,
      selectedClipId: null,
      currentTimeMs: 0,
      isPlaying: false,
    });
  },
  
  resetEditor: () => {
    set({
      projectId: null,
      projectTitle: 'Untitled Project',
      projectSettings: DEFAULT_PROJECT_SETTINGS,
      isDirty: false,
      timeline: { ...initialTimeline, tracks: initialTimeline.tracks.map(t => ({ ...t, clips: [] })) },
      assets: [],
      selectedTrackId: null,
      selectedClipId: null,
      currentTimeMs: 0,
      isPlaying: false,
      isExporting: false,
    });
  },
  
  // Asset actions
  addAsset: (asset) => {
    set((state) => ({
      assets: [...state.assets, asset],
      isDirty: true,
    }));
  },
  
  updateAsset: (assetId, updates) => {
    set((state) => ({
      assets: state.assets.map((a) =>
        a.id === assetId ? { ...a, ...updates } : a
      ),
      // Also update asset in clips
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) =>
            c.asset?.id === assetId
              ? { ...c, asset: { ...c.asset, ...updates } }
              : c
          ),
        })),
      },
    }));
  },
  
  removeAsset: (assetId) => {
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== assetId),
      isDirty: true,
    }));
  },
  
  // Track actions
  addTrack: (type) => {
    const id = `track-${type.toLowerCase()}-${generateId()}`;
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: [
          ...state.timeline.tracks,
          {
            id,
            type,
            order: state.timeline.tracks.length,
            muted: false,
            volume: 1,
            locked: false,
            clips: [],
          },
        ],
      },
      isDirty: true,
    }));
  },
  
  removeTrack: (trackId) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.filter((t) => t.id !== trackId),
      },
      selectedTrackId: state.selectedTrackId === trackId ? null : state.selectedTrackId,
      isDirty: true,
    }));
    get().recalculateDuration();
  },
  
  updateTrack: (trackId, updates) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((t) =>
          t.id === trackId ? { ...t, ...updates } : t
        ),
      },
      isDirty: true,
    }));
  },
  
  // Clip actions
  addClip: (trackId, clipData) => {
    const id = `clip-${generateId()}`;
    
    // Auto-resolve asset from assetId if not provided
    const resolvedAsset = clipData.asset ?? 
      (clipData.assetId ? get().assets.find(a => a.id === clipData.assetId) : undefined);
    
    const clip: EditorClip = {
      id,
      assetId: clipData.assetId ?? null,
      startMs: clipData.startMs,
      endMs: clipData.endMs,
      trimStartMs: clipData.trimStartMs ?? 0,
      trimEndMs: clipData.trimEndMs ?? 0,
      transforms: clipData.transforms ?? DEFAULT_TRANSFORMS,
      effects: clipData.effects ?? DEFAULT_EFFECTS,
      asset: resolvedAsset,
    };
    
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((t) =>
          t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t
        ),
      },
      isDirty: true,
    }));
    
    get().recalculateDuration();
    return id;
  },
  
  removeClip: (trackId, clipId) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((t) =>
          t.id === trackId
            ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
            : t
        ),
      },
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
      isDirty: true,
    }));
    get().recalculateDuration();
  },
  
  updateClip: (trackId, clipId, updates) => {
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((t) =>
          t.id === trackId
            ? {
                ...t,
                clips: t.clips.map((c) =>
                  c.id === clipId ? { ...c, ...updates } : c
                ),
              }
            : t
        ),
      },
      isDirty: true,
    }));
    get().recalculateDuration();
  },
  
  moveClip: (fromTrackId, toTrackId, clipId, newStartMs) => {
    const state = get();
    const fromTrack = state.timeline.tracks.find((t) => t.id === fromTrackId);
    const clip = fromTrack?.clips.find((c) => c.id === clipId);
    
    if (!clip) return;
    
    const clipDuration = clip.endMs - clip.startMs;
    const updatedClip = {
      ...clip,
      startMs: newStartMs,
      endMs: newStartMs + clipDuration,
    };
    
    set((state) => ({
      timeline: {
        ...state.timeline,
        tracks: state.timeline.tracks.map((t) => {
          if (t.id === fromTrackId && fromTrackId !== toTrackId) {
            return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
          }
          if (t.id === toTrackId) {
            if (fromTrackId === toTrackId) {
              return {
                ...t,
                clips: t.clips.map((c) => (c.id === clipId ? updatedClip : c)),
              };
            }
            return { ...t, clips: [...t.clips, updatedClip] };
          }
          return t;
        }),
      },
      isDirty: true,
    }));
    get().recalculateDuration();
  },
  
  // Selection
  selectTrack: (trackId) => set({ selectedTrackId: trackId }),
  selectClip: (clipId) => set({ selectedClipId: clipId }),
  
  // Playback
  setCurrentTime: (timeMs) => set({ currentTimeMs: Math.max(0, timeMs) }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
  
  // Zoom
  setZoomLevel: (level) => set({ zoomLevel: Math.max(10, Math.min(500, level)) }),
  setScrollLeft: (scroll) => set({ scrollLeft: Math.max(0, scroll) }),
  
  // Duration
  recalculateDuration: () => {
    const state = get();
    let maxEnd = 0;
    
    for (const track of state.timeline.tracks) {
      for (const clip of track.clips) {
        if (clip.endMs > maxEnd) {
          maxEnd = clip.endMs;
        }
      }
    }
    
    set((state) => ({
      timeline: { ...state.timeline, durationMs: maxEnd },
    }));
  },
  
  // Export
  setExportSettings: (settings) => {
    set((state) => ({
      exportSettings: { ...state.exportSettings, ...settings },
    }));
  },
  
  getExportPayload: () => {
    const state = get();
    if (!state.projectId) return null;
    
    return {
      projectId: state.projectId,
      timeline: state.timeline,
      export: state.exportSettings,
    };
  },
  
  // Text overlay actions
  addTextOverlay: (overlay) => {
    const id = generateId();
    set((state) => ({
      textOverlays: [...state.textOverlays, { ...overlay, id }],
      selectedTextOverlayId: id,
      isDirty: true,
    }));
    return id;
  },
  
  updateTextOverlay: (id, updates) => {
    set((state) => ({
      textOverlays: state.textOverlays.map((overlay) =>
        overlay.id === id ? { ...overlay, ...updates } : overlay
      ),
      isDirty: true,
    }));
  },
  
  removeTextOverlay: (id) => {
    set((state) => ({
      textOverlays: state.textOverlays.filter((overlay) => overlay.id !== id),
      selectedTextOverlayId: state.selectedTextOverlayId === id ? null : state.selectedTextOverlayId,
      isDirty: true,
    }));
  },
  
  selectTextOverlay: (id) => {
    set({ selectedTextOverlayId: id });
  },
}));
