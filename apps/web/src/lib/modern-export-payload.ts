import type { Layer, ModernProject } from '@vibe-creator/shared';
import { extractTextOverlays } from '@/lib/modern-compiler';
import { resolveTextBackground } from '@/lib/modern-text-background';
import type { EditorTimeline } from '@/stores/editor-store';

interface BuildModernExportTimelineDataInput {
  project: ModernProject;
  timeline: EditorTimeline;
  assetPathById: ReadonlyMap<string, string>;
}

export interface ModernExportTimelineData {
  clips: Array<{
    localPath: string;
    layerId?: string;
    mediaType: 'video' | 'image';
    startTime: number;
    endTime: number;
    timelineStartMs?: number;
    timelineEndMs?: number;
    zIndex?: number;
    fit?: 'contain' | 'cover';
    visible?: boolean;
    loop?: boolean;
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
    fontStyle?: string;
    color: string;
    backgroundColor?: string;
    backgroundOpacity?: number;
    zIndex?: number;
    opacity?: number;
    rotation?: number;
    textAlign?: 'left' | 'center' | 'right';
    visible?: boolean;
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
    loop?: boolean;
  }>;
  settings: {
    width: number;
    height: number;
    fps: number;
    backgroundColor: string;
    backgroundMode: ModernProject['settings']['backgroundMode'];
    backgroundOpacity?: number;
    backgroundBlurAmount?: number;
    backgroundBlurZoom?: number;
    backgroundDim?: number;
    backgroundSaturation?: number;
    backgroundGradientFrom?: string;
    backgroundGradientTo?: string;
    backgroundGradientAngle?: number;
    backgroundImagePath?: string;
    backgroundImageFit?: 'contain' | 'cover';
    backgroundImageBlurAmount?: number;
    backgroundImageDim?: number;
    backgroundImagePositionX?: number;
    backgroundImagePositionY?: number;
    backgroundImageScale?: number;
  };
}

type VideoClipPayload = ModernExportTimelineData['clips'][0];
type AudioTrackPayload = ModernExportTimelineData['audioTracks'][0];

function buildVideoClipPayload(
  clip: EditorTimeline['tracks'][0]['clips'][0],
  layerById: Map<string, Layer>,
  assetPathById: ReadonlyMap<string, string>,
): VideoClipPayload[] {
  const asset = clip.asset;
  const sourceLayer = clip.layerId ? layerById.get(clip.layerId) : undefined;
  if (
    !asset ||
    (asset.type !== 'VIDEO' && asset.type !== 'IMAGE') ||
    clip.visible === false ||
    sourceLayer?.visible === false
  ) {
    return [];
  }

  const durationMs = Math.max(100, clip.endMs - clip.startMs);
  const sourceStartMs = clip.trimStartMs ?? 0;
  let sourceEndMs = sourceStartMs + durationMs;
  if (clip.trimEndMs && clip.trimEndMs > sourceStartMs) {
    sourceEndMs = clip.trimEndMs;
  } else if (clip.loop && asset.durationMs) {
    sourceEndMs = asset.durationMs;
  }

  return [
    {
      localPath: assetPathById.get(asset.id) ?? asset.url,
      layerId: clip.layerId,
      mediaType: asset.type === 'IMAGE' ? 'image' : 'video',
      startTime: sourceStartMs / 1000,
      endTime: sourceEndMs / 1000,
      timelineStartMs: clip.startMs,
      timelineEndMs: clip.endMs,
      zIndex: clip.zIndex ?? sourceLayer?.zIndex,
      fit:
        clip.fit ??
        (sourceLayer?.type === 'video' || sourceLayer?.type === 'image'
          ? sourceLayer.data.fit
          : undefined),
      visible: true,
      loop: clip.loop,
      transforms: clip.transforms,
      effects: clip.effects,
    },
  ];
}

function buildAudioTrackPayload(
  clip: EditorTimeline['tracks'][0]['clips'][0],
  trackMuted: boolean,
  layerById: Map<string, Layer>,
  assetPathById: ReadonlyMap<string, string>,
): AudioTrackPayload[] {
  const asset = clip.asset;
  const sourceLayer = clip.layerId ? layerById.get(clip.layerId) : undefined;
  if (
    !asset ||
    (asset.type !== 'AUDIO' && asset.type !== 'VIDEO') ||
    trackMuted ||
    clip.visible === false ||
    sourceLayer?.visible === false
  ) {
    return [];
  }

  const durationMs = Math.max(100, clip.endMs - clip.startMs);
  const sourceStartMs = clip.trimStartMs ?? 0;
  let sourceEndMs = sourceStartMs + durationMs;
  if (clip.trimEndMs && clip.trimEndMs > sourceStartMs) {
    sourceEndMs = clip.trimEndMs;
  } else if (clip.loop && asset.durationMs) {
    sourceEndMs = asset.durationMs;
  }

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
      loop: clip.loop,
    },
  ];
}

export function buildModernExportTimelineData({
  project,
  timeline,
  assetPathById,
}: BuildModernExportTimelineDataInput): ModernExportTimelineData {
  const layerById = new Map(project.layers.map((layer) => [layer.id, layer]));

  return {
    clips: timeline.tracks
      .filter((track) => track.type === 'VIDEO' && !track.muted)
      .flatMap((track) =>
        track.clips.flatMap((clip) => buildVideoClipPayload(clip, layerById, assetPathById)),
      ),
    audioTracks: timeline.tracks
      .filter((track) => track.type === 'AUDIO')
      .flatMap((track) =>
        track.clips.flatMap((clip) =>
          buildAudioTrackPayload(clip, track.muted, layerById, assetPathById),
        ),
      ),
    textOverlays: extractTextOverlays(project).map((overlay) => {
      const background = resolveTextBackground({
        text: overlay.text,
        fontFamily: overlay.fontFamily,
        fontSize: overlay.fontSize,
        fontWeight: overlay.fontWeight,
        fontStyle: overlay.fontStyle,
        color: overlay.color,
        backgroundColor: overlay.backgroundColor,
        backgroundOpacity: overlay.backgroundOpacity,
        textAlign: overlay.textAlign,
        animation: overlay.animation,
        animationIn: overlay.animationIn,
        animationOut: overlay.animationOut,
        animationLoop: overlay.animationLoop,
      });

      return {
        id: overlay.id,
        content: overlay.text,
        startMs: overlay.startMs,
        endMs: overlay.endMs,
        x: overlay.x,
        y: overlay.y,
        fontSize: overlay.fontSize,
        fontFamily: overlay.fontFamily,
        fontWeight: overlay.fontWeight,
        fontStyle: overlay.fontStyle,
        color: overlay.color,
        backgroundColor: background.color,
        backgroundOpacity: background.opacity,
        zIndex: overlay.zIndex,
        opacity: overlay.opacity,
        rotation: overlay.rotation,
        textAlign: overlay.textAlign,
        visible: true,
        animation: overlay.animation,
        animationIn: overlay.animationIn,
        animationOut: overlay.animationOut,
        animationLoop: overlay.animationLoop,
      };
    }),
    settings: {
      width: project.settings.width,
      height: project.settings.height,
      fps: project.settings.fps,
      backgroundColor: project.settings.backgroundColor,
      backgroundMode: project.settings.backgroundMode,
      backgroundOpacity: project.settings.backgroundOpacity ?? 1,
      backgroundBlurAmount: project.settings.backgroundBlurAmount ?? 18,
      backgroundBlurZoom: project.settings.backgroundBlurZoom ?? 1.08,
      backgroundDim: project.settings.backgroundDim ?? 0.08,
      backgroundSaturation: project.settings.backgroundSaturation ?? 1.05,
      backgroundGradientFrom: project.settings.backgroundGradientFrom ?? '#111827',
      backgroundGradientTo: project.settings.backgroundGradientTo ?? '#ff4b1f',
      backgroundGradientAngle: project.settings.backgroundGradientAngle ?? 135,
      backgroundImagePath: project.settings.backgroundImageAssetId
        ? assetPathById.get(project.settings.backgroundImageAssetId)
        : undefined,
      backgroundImageFit: project.settings.backgroundImageFit ?? 'cover',
      backgroundImageBlurAmount: project.settings.backgroundImageBlurAmount ?? 0,
      backgroundImageDim: project.settings.backgroundImageDim ?? 0,
      backgroundImagePositionX: project.settings.backgroundImagePositionX ?? 50,
      backgroundImagePositionY: project.settings.backgroundImagePositionY ?? 50,
      backgroundImageScale: project.settings.backgroundImageScale ?? 1,
    },
  };
}
