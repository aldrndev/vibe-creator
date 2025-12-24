export type ProjectStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED';
export type AssetType = 'VIDEO' | 'AUDIO' | 'IMAGE' | 'VOICE';
export type TrackType = 'VIDEO' | 'AUDIO' | 'TEXT' | 'OVERLAY';

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  settings: ProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSettings {
  width: number;
  height: number;
  fps: number;
  maxDurationMs: number;
}

export interface ProjectAsset {
  id: string;
  projectId: string;
  type: AssetType;
  name: string;
  sourceUrl: string | null;
  r2Key: string;
  metadata: AssetMetadata;
  createdAt: Date;
}

export interface AssetMetadata {
  durationMs?: number;
  width?: number;
  height?: number;
  fileSize: number;
  mimeType: string;
  thumbnailKey?: string;
}

export interface Timeline {
  id: string;
  projectId: string;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  settings: TimelineSettings;
}

export interface TimelineSettings {
  backgroundColor: string;
  snapToGrid: boolean;
  gridSize: number;
}

export interface TimelineTrack {
  id: string;
  timelineId: string;
  type: TrackType;
  order: number;
  muted: boolean;
  volume: number;
  locked: boolean;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  assetId: string | null;
  startMs: number;
  endMs: number;
  trimStartMs: number;
  trimEndMs: number;
  transforms: ClipTransforms;
  effects: ClipEffects;
}

export interface ClipTransforms {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
}

export interface ClipEffects {
  filters: string[];
  speed: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
}

// Text overlay for video editor
export interface TextOverlay {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  backgroundColor?: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  textAlign: 'left' | 'center' | 'right';
  startMs: number;
  endMs: number;
  animation: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'typewriter';
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  settings?: Partial<ProjectSettings>;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  status?: ProjectStatus;
  settings?: Partial<ProjectSettings>;
}
