/**
 * Feature Flags Configuration
 *
 * Controls rollout of experimental features.
 * Set via environment variables with VITE_FEATURE_ prefix.
 */

export const FEATURES = {
  /**
   * Modern Video Editor (Video Studio)
   * Canvas-based editing with layers instead of timeline
   */
  MODERN_EDITOR: import.meta.env.VITE_FEATURE_MODERN_EDITOR === "true",

  /**
   * AI Story Director
   * AI-powered story/scene generation (requires AI API key)
   */
  STORY_DIRECTOR: import.meta.env.VITE_FEATURE_STORY_DIRECTOR !== "false",
} as const;

export type FeatureFlags = typeof FEATURES;
export type FeatureName = keyof FeatureFlags;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: FeatureName): boolean {
  return FEATURES[feature];
}
