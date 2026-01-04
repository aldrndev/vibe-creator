import { StoryProject, StoryScene } from "@vibe-creator/shared";
import type {
  EditorTimeline,
  EditorTrack,
  EditorClip,
} from "../stores/editor-store";

// Constants
// const TRANSITION_DURATION_MS = 500;
const DEFAULT_BGM_VOLUME = 0.5;
// const DUCKED_BGM_VOLUME = 0.15; // -10dB approx

/**
 * Deterministically compiles a StoryProject into an EditorTimeline.
 * This is the "One-Way" bridge from Story Mode to Advanced Editor.
 */
export function compileStoryToTimeline(story: StoryProject): EditorTimeline {
  const tracks: EditorTrack[] = [
    createTrack("video", 0),
    createTrack("audio", 1), // Voiceover
    createTrack("audio", 2), // BGM
    createTrack("text", 3), // Overlays
  ];

  let currentTimeMs = 0;

  // 1. Process Scenes
  story.scenes.forEach((scene, index) => {
    const sceneDurationMs = calculateSceneDuration(scene);

    // Add Visual Clip
    if (scene.assets?.visual?.assetId) {
      const clip = createClip({
        sceneId: scene.id,
        assetId: scene.assets.visual.assetId,
        type: "VIDEO", // Simplification: assume visual is video for now
        startMs: currentTimeMs,
        durationMs: sceneDurationMs,
        trackType: "video",
        index,
      });
      tracks[0]?.clips.push(clip);
    }

    // Add Voiceover Clip
    if (scene.assets?.audio?.assetId) {
      // Voiceover might be shorter than scene, center it or start at 0?
      // For now, start at 0 relative to scene
      const clip = createClip({
        sceneId: scene.id,
        assetId: scene.assets.audio.assetId,
        type: "AUDIO",
        startMs: currentTimeMs,
        durationMs: sceneDurationMs, // In reality, use actual audio duration
        trackType: "audio",
        index,
      });
      tracks[1]?.clips.push(clip);
    }

    // Add Text Overlay
    // (Skipped for now, but would go to tracks[3])

    currentTimeMs += sceneDurationMs;
  });

  // 2. Add Global BGM
  if (story.globalVibe.bgmAssetId) {
    // Create looping BGM
    // Ideally we check asset duration, but for now we make one long clip
    // or repeat it.
    const bgmClip = createClip({
      sceneId: "global-bgm",
      assetId: story.globalVibe.bgmAssetId,
      type: "AUDIO",
      startMs: 0,
      durationMs: currentTimeMs, // Loop for full duration
      trackType: "audio",
      index: 0,
    });

    // Apply Volume Automation (Ducking)
    // This is complex, would need keyframes.
    // For simplified v1, just set volume to default.
    bgmClip.effects = {
      ...bgmClip.effects,
      volume: DEFAULT_BGM_VOLUME,
    };

    tracks[2]?.clips.push(bgmClip);
  }

  return {
    durationMs: currentTimeMs,
    tracks: tracks,
  };
}

// --- Helpers ---

function createTrack(type: string, order: number): EditorTrack {
  return {
    id: `track-${type}-${order}`,
    type: type === "video" ? "VIDEO" : type === "audio" ? "AUDIO" : "TEXT",
    order,
    muted: false,
    volume: 1,
    locked: false,
    clips: [],
  } as unknown as EditorTrack; // Type cast for now due to shared type mismatch
}

function createClip(params: {
  sceneId: string;
  assetId: string;
  type: "VIDEO" | "AUDIO" | "IMAGE";
  startMs: number;
  durationMs: number;
  trackType: string;
  index: number;
}): EditorClip {
  // Stable ID generation
  const id = `clip-${params.trackType}-${params.index}-${params.sceneId}`;

  return {
    id,
    assetId: params.assetId,
    startMs: params.startMs,
    endMs: params.startMs + params.durationMs,
    trimStartMs: 0,
    trimEndMs: params.durationMs,
    transforms: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
    effects: { filters: [], speed: 1, volume: 1, fadeIn: 0, fadeOut: 0 },
  } as EditorClip;
}

function calculateSceneDuration(scene: StoryScene): number {
  // If we had actual asset metadata (e.g. video file duration), we would clamp here.
  // For now, trust the targetDurationMs logic.
  return scene.targetDurationMs;
}
