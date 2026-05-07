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
    color: string;
    backgroundColor?: string;
  }>;
  settings: {
    width: number;
    height: number;
    fps: number;
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
    textOverlays: extractTextOverlays(project).map((overlay) => ({
      id: overlay.id,
      content: overlay.text,
      startMs: overlay.startMs,
      endMs: overlay.endMs,
      x: overlay.x,
      y: overlay.y,
      fontSize: overlay.fontSize,
      fontFamily: overlay.fontFamily,
      color: overlay.color,
      backgroundColor: overlay.backgroundColor,
    })),
    settings: {
      width: project.settings.width,
      height: project.settings.height,
      fps: project.settings.fps,
    },
  };
}
