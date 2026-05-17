import { createTextLayer } from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import {
  buildTextQuickActionLayerUpdate,
  getCanvasPresetSettings,
  getTextQuickAction,
  videoStudioElementActionIds,
  videoStudioOpeningClosingActionIds,
  videoStudioTextActions,
  videoStudioTextTemplateActionIds,
} from '@/lib/modern-editor-quick-actions';

describe('modern editor quick actions', () => {
  it('returns creator-friendly canvas presets', () => {
    expect(getCanvasPresetSettings('short')).toEqual({ width: 1080, height: 1920 });
    expect(getCanvasPresetSettings('landscape')).toEqual({ width: 1920, height: 1080 });
    expect(getCanvasPresetSettings('square')).toEqual({ width: 1080, height: 1080 });
  });

  it('builds styled text updates from quick actions', () => {
    const layer = createTextLayer('layer-text', 'Original', 0, 2000, 7000);
    const action = getTextQuickAction('closing');
    const update = buildTextQuickActionLayerUpdate(layer, action);

    expect(update.x).toBe(action.x);
    expect(update.y).toBe(action.y);
    expect(update.endMs).toBe(6000);
    expect(update.data).toEqual(
      expect.objectContaining({
        text: action.text,
        fontSize: action.data.fontSize,
        animation: action.data.animation,
      }),
    );
  });

  it('includes template and element actions for one-click editing', () => {
    expect(getTextQuickAction('lower-third').label).toBe('Label Bawah');
    expect(getTextQuickAction('quote').data.animation).toBe('fade');
    expect(getTextQuickAction('highlight').data.backgroundColor).toBe('#fef08a');
    expect(getTextQuickAction('marker').text).toBe('!');
    expect(getTextQuickAction('opening-breaking').preview.badge).toBe('News');
    expect(getTextQuickAction('caption-keyword').data.animation).toBe('slide-up');
  });

  it('provides visual metadata for preset asset cards', () => {
    expect(getTextQuickAction('opening').preview.variant).toBe('hook');
    expect(getTextQuickAction('cta').preview.badge).toBe('CTA');
    expect(
      videoStudioTextActions.every(
        (action) => action.description.length > 0 && action.preview.title.length > 0,
      ),
    ).toBe(true);
  });

  it('groups preset variations into complete sidebar categories', () => {
    const actionIds = new Set(videoStudioTextActions.map((action) => action.id));
    const groupedIds = [
      ...videoStudioOpeningClosingActionIds,
      ...videoStudioTextTemplateActionIds,
      ...videoStudioElementActionIds,
    ];

    expect(videoStudioOpeningClosingActionIds.length).toBeGreaterThanOrEqual(8);
    expect(videoStudioTextTemplateActionIds.length).toBeGreaterThanOrEqual(15);
    expect(videoStudioElementActionIds.length).toBeGreaterThanOrEqual(9);
    expect(groupedIds.every((id) => actionIds.has(id))).toBe(true);
    expect(new Set(groupedIds).size).toBe(videoStudioTextActions.length);
  });
});
