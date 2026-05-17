import type { ModernProject } from '@vibe-creator/shared';
import { extractTextOverlays } from '@/lib/modern-compiler';
import type { EditorTimeline } from '@/stores/editor-store';

interface BuildModernExportTimelineDataInput {
  project: ModernProject;
  timeline: EditorTimeline;
  assetPathById: ReadonlyMap<string, string>;
}

export interface ModernExportTimelineData {
  clips: Array<{
    localPath: string;
    mediaType: 'video' | 'image';
    startTime: number;
    endTime: number;
    transforms: NonNullable<EditorTimeline['tracks'][number]['clips'][number]['transforms']>;
    effects: NonNullable<EditorTimeline['tracks'][number]['clips'][number]['effects']>;
  }>;
  textOverlays: Array<{
    id: string;
    content: string;
    startMs: number;
    endMs: number;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fontWeight?: string;
    color: string;
    backgroundColor?: string;
    animation?: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'typewriter';
    animationIn?: string;
    animationOut?: string;
    animationLoop?: string;
  }>;
  audioTracks: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
    timelineStartMs: number;
    timelineEndMs: number;
    volume: number;
    fadeInMs: number;
    fadeOutMs: number;
  }>;
  settings: {
    width: number;
    height: number;
    fps: number;
    backgroundColor: string;
    backgroundMode: ModernProject['settings']['backgroundMode'];
    backgroundBlurAmount?: number;
    backgroundBlurZoom?: number;
    backgroundDim?: number;
    backgroundSaturation?: number;
  };
}

export function buildModernExportTimelineData({
  project,
  timeline,
  assetPathById,
}: BuildModernExportTimelineDataInput): ModernExportTimelineData {
  return {
    clips: timeline.tracks
      .filter((track) => track.type === 'VIDEO')
      .flatMap((track) =>
        track.clips.flatMap((clip) => {
          const asset = clip.asset;
          if (!asset || (asset.type !== 'VIDEO' && asset.type !== 'IMAGE')) {
            return [];
          }

          const durationMs = Math.max(100, clip.endMs - clip.startMs);
          const sourceStartMs = clip.trimStartMs ?? 0;
          const sourceEndMs =
            clip.trimEndMs && clip.trimEndMs > sourceStartMs
              ? clip.trimEndMs
              : sourceStartMs + durationMs;

          return [
            {
              localPath: assetPathById.get(asset.id) ?? asset.url,
              mediaType: asset.type === 'IMAGE' ? 'image' : 'video',
              startTime: sourceStartMs / 1000,
              endTime: sourceEndMs / 1000,
              transforms: clip.transforms,
              effects: clip.effects,
            },
          ];
        }),
      ),
    audioTracks: timeline.tracks
      .filter((track) => track.type === 'AUDIO')
      .flatMap((track) =>
        track.clips.flatMap((clip) => {
          const asset = clip.asset;
          if (!asset || asset.type !== 'AUDIO') {
            return [];
          }

          const durationMs = Math.max(100, clip.endMs - clip.startMs);
          const sourceStartMs = clip.trimStartMs ?? 0;
          const sourceEndMs =
            clip.trimEndMs && clip.trimEndMs > sourceStartMs
              ? clip.trimEndMs
              : sourceStartMs + durationMs;

          return [
            {
              localPath: assetPathById.get(asset.id) ?? asset.url,
              startTime: sourceStartMs / 1000,
              endTime: sourceEndMs / 1000,
              timelineStartMs: clip.startMs,
              timelineEndMs: clip.endMs,
              volume: clip.effects?.volume ?? 1,
              fadeInMs: clip.effects?.fadeIn ?? 0,
              fadeOutMs: clip.effects?.fadeOut ?? 0,
            },
          ];
        }),
      ),
    textOverlays: extractTextOverlays(project).map((overlay) => ({
      id: overlay.id,
      content: overlay.text,
      startMs: overlay.startMs,
      endMs: overlay.endMs,
      x: overlay.x,
      y: overlay.y,
      fontSize: overlay.fontSize,
      fontFamily: overlay.fontFamily,
      fontWeight: overlay.fontWeight,
      color: overlay.color,
      backgroundColor: overlay.backgroundColor,
      animation: overlay.animation,
      animationIn: overlay.animationIn,
      animationOut: overlay.animationOut,
      animationLoop: overlay.animationLoop,
    })),
    settings: {
      width: project.settings.width,
      height: project.settings.height,
      fps: project.settings.fps,
      backgroundColor: project.settings.backgroundColor,
      backgroundMode: project.settings.backgroundMode,
      backgroundBlurAmount: project.settings.backgroundBlurAmount ?? 18,
      backgroundBlurZoom: project.settings.backgroundBlurZoom ?? 1.08,
      backgroundDim: project.settings.backgroundDim ?? 0.08,
      backgroundSaturation: project.settings.backgroundSaturation ?? 1.05,
    },
  };
}
