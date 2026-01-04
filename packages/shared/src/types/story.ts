export const STORY_SCHEMA_VERSION = 1;

export type SceneType = "intro" | "hook" | "content" | "transition" | "outro";

export interface StoryAsset {
  assetId: string; // UUID (Primary Reference)
  type: "video" | "image" | "audio";
  origin: "upload" | "import" | "ai"; // Provenance
  storageKey?: string; // Server-side usage only, optional on client
  promptId?: string; // Reference to prompt record (security: no raw prompt storage)
  url?: string; // Optional: Temp URL for playback if available
}

export interface StoryScene {
  id: string; // UUID
  type: SceneType;
  title: string;
  description: string; // AI Direction instruction

  targetDurationMs: number; // Duration in MILLISECONDS

  // The Vibe of this specific scene
  vibe?: {
    mood: string;
    style: string;
    musicAssetId?: string;
  };

  // Content
  assets: {
    visual?: StoryAsset;
    audio?: StoryAsset; // Voiceover
    overlay?: string; // Text overlay content
  };

  // Output-only references (for jumping to editor)
  compiledClipRefs?: string[];
}

export interface StoryProject {
  id: string; // UUID
  projectId: string; // Link to main project
  version: number;

  isFrozen: boolean; // True if forked to Advanced Mode
  frozenAt?: string; // ISO Date

  globalVibe: {
    bgmAssetId?: string;
    voiceId?: string; // AI Narrator ID
    tempo: "slow" | "medium" | "fast";
  };

  scenes: StoryScene[];
}
