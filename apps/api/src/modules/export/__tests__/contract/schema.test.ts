/**
 * @module export/__tests__/contract/schema
 * @description Contract tests for export Zod schemas.
 *
 * Per Digitesia Testing Standard: Schema-first testing ensures
 * API contracts are validated and breaking changes are detected.
 */

import { describe, expect, it } from 'vitest';
import {
  clipEffectsSchema,
  clipTransformsSchema,
  EDITOR_LIMITS,
  EDITOR_SCHEMA_VERSION,
  EXPORT_CAPABILITIES,
  editorProjectDTOSchema,
  exportSettingsSchema,
  QUALITY_PRESETS,
  RESOLUTION_MAP,
  timelineClipSchema,
} from '@/modules/export/export.schema';

describe('export.schema contracts', () => {
  describe('EDITOR_SCHEMA_VERSION', () => {
    it('should be a positive integer', () => {
      expect(EDITOR_SCHEMA_VERSION).toBeGreaterThan(0);
      expect(Number.isInteger(EDITOR_SCHEMA_VERSION)).toBe(true);
    });
  });

  describe('EDITOR_LIMITS', () => {
    it('should have maximum duration limit', () => {
      expect(EDITOR_LIMITS.MAX_DURATION_MS).toBe(30 * 60 * 1000); // 30 min
    });

    it('should have clip limits', () => {
      expect(EDITOR_LIMITS.MAX_CLIPS_PER_TRACK).toBeGreaterThan(0);
      expect(EDITOR_LIMITS.MIN_CLIP_DURATION_MS).toBeLessThan(EDITOR_LIMITS.MAX_CLIP_DURATION_MS);
    });
  });

  describe('EXPORT_CAPABILITIES', () => {
    it('should support MP4 format', () => {
      expect(EXPORT_CAPABILITIES.MP4).toBeDefined();
      expect(EXPORT_CAPABILITIES.MP4.container).toBe('mp4');
      expect(EXPORT_CAPABILITIES.MP4.codecs).toContain('h264');
    });

    it('should support WEBM format', () => {
      expect(EXPORT_CAPABILITIES.WEBM).toBeDefined();
      expect(EXPORT_CAPABILITIES.WEBM.container).toBe('webm');
    });

    it('should have valid resolutions for each format', () => {
      for (const [_format, caps] of Object.entries(EXPORT_CAPABILITIES)) {
        expect(caps.resolutions.length).toBeGreaterThan(0);
        expect(caps.codecs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('clipEffectsSchema', () => {
    it('should accept valid effects', () => {
      const validEffects = {
        volume: 1,
        speed: 1,
        fadeInMs: 0,
        fadeOutMs: 0,
        filters: [],
      };
      expect(() => clipEffectsSchema.parse(validEffects)).not.toThrow();
    });

    it('should reject volume outside 0-2 range', () => {
      expect(() => clipEffectsSchema.parse({ volume: 3 })).toThrow();
      expect(() => clipEffectsSchema.parse({ volume: -1 })).toThrow();
    });

    it('should reject speed outside 0.25-4 range', () => {
      expect(() => clipEffectsSchema.parse({ speed: 0.1 })).toThrow();
      expect(() => clipEffectsSchema.parse({ speed: 5 })).toThrow();
    });

    it('should have correct defaults', () => {
      const result = clipEffectsSchema.parse({});
      expect(result.volume).toBe(1);
      expect(result.speed).toBe(1);
      expect(result.fadeInMs).toBe(0);
      expect(result.fadeOutMs).toBe(0);
    });
  });

  describe('clipTransformsSchema', () => {
    it('should accept valid transforms', () => {
      const validTransforms = {
        x: 100,
        y: 200,
        scale: 1.5,
        rotation: 45,
        opacity: 0.8,
      };
      expect(() => clipTransformsSchema.parse(validTransforms)).not.toThrow();
    });

    it('should reject scale outside 0.1-10 range', () => {
      expect(() => clipTransformsSchema.parse({ scale: 0.05 })).toThrow();
      expect(() => clipTransformsSchema.parse({ scale: 15 })).toThrow();
    });

    it('should reject opacity outside 0-1 range', () => {
      expect(() => clipTransformsSchema.parse({ opacity: 1.5 })).toThrow();
    });
  });

  describe('timelineClipSchema', () => {
    const validClip = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      assetId: '123e4567-e89b-12d3-a456-426614174001',
      startMs: 0,
      endMs: 5000,
    };

    it('should accept valid clip', () => {
      expect(() => timelineClipSchema.parse(validClip)).not.toThrow();
    });

    it('should reject endMs <= startMs', () => {
      expect(() => timelineClipSchema.parse({ ...validClip, endMs: 0 })).toThrow();
    });

    it('should reject clip too short', () => {
      expect(() =>
        timelineClipSchema.parse({
          ...validClip,
          endMs: validClip.startMs + 50, // Less than MIN_CLIP_DURATION_MS
        }),
      ).toThrow();
    });
  });

  describe('exportSettingsSchema', () => {
    it('should accept valid export settings', () => {
      const validSettings = {
        format: 'MP4' as const,
        resolution: '1080p' as const,
        quality: 'high' as const,
      };
      expect(() => exportSettingsSchema.parse(validSettings)).not.toThrow();
    });

    it('should have correct defaults', () => {
      const result = exportSettingsSchema.parse({});
      expect(result.format).toBe('MP4');
      expect(result.resolution).toBe('1080p');
      expect(result.quality).toBe('high');
      expect(result.addWatermark).toBe(true);
    });

    it('should reject invalid format/resolution combination', () => {
      // MOV only supports 1080p and 4K
      expect(() =>
        exportSettingsSchema.parse({
          format: 'MOV',
          resolution: '720p',
        }),
      ).toThrow('Resolution not supported');
    });

    it('should accept preset enum values', () => {
      const presets = ['youtube', 'tiktok', 'instagram_feed'] as const;
      for (const preset of presets) {
        expect(() => exportSettingsSchema.parse({ preset })).not.toThrow();
      }
    });
  });

  describe('editorProjectDTOSchema', () => {
    const minimalValidProject = {
      schemaVersion: EDITOR_SCHEMA_VERSION,
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      timeline: {
        durationMs: 10000,
        tracks: [
          {
            id: '123e4567-e89b-12d3-a456-426614174001',
            type: 'VIDEO' as const,
            order: 0,
            clips: [
              {
                id: '123e4567-e89b-12d3-a456-426614174002',
                assetId: '123e4567-e89b-12d3-a456-426614174003',
                startMs: 0,
                endMs: 5000,
              },
            ],
          },
        ],
      },
      textOverlays: [],
      exportSettings: {},
      assets: [],
    };

    it('should accept minimal valid project', () => {
      expect(() => editorProjectDTOSchema.parse(minimalValidProject)).not.toThrow();
    });

    it('should reject wrong schema version', () => {
      expect(() =>
        editorProjectDTOSchema.parse({
          ...minimalValidProject,
          schemaVersion: 999,
        }),
      ).toThrow();
    });

    it('should require at least one track', () => {
      expect(() =>
        editorProjectDTOSchema.parse({
          ...minimalValidProject,
          timeline: { durationMs: 10000, tracks: [] },
        }),
      ).toThrow();
    });
  });

  describe('RESOLUTION_MAP', () => {
    it('should map 720p to 1280x720', () => {
      expect(RESOLUTION_MAP['720p']).toEqual({ width: 1280, height: 720 });
    });

    it('should map 1080p to 1920x1080', () => {
      expect(RESOLUTION_MAP['1080p']).toEqual({ width: 1920, height: 1080 });
    });

    it('should map 4K to 3840x2160', () => {
      expect(RESOLUTION_MAP['4K']).toEqual({ width: 3840, height: 2160 });
    });
  });

  describe('QUALITY_PRESETS', () => {
    it('should have increasing bitrates for quality levels', () => {
      const bitrates = [
        parseInt(QUALITY_PRESETS.low.videoBitrate, 10),
        parseInt(QUALITY_PRESETS.medium.videoBitrate, 10),
        parseInt(QUALITY_PRESETS.high.videoBitrate, 10),
        parseInt(QUALITY_PRESETS.lossless.videoBitrate, 10),
      ];

      for (let i = 1; i < bitrates.length; i++) {
        const current = bitrates[i];
        const previous = bitrates[i - 1];

        expect(current).toBeDefined();
        expect(previous).toBeDefined();
        if (current === undefined || previous === undefined) {
          throw new Error('Expected bitrate presets to be defined');
        }

        expect(current).toBeGreaterThan(previous);
      }
    });
  });
});
