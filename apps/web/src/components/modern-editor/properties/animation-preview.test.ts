import { describe, expect, it } from 'vitest';
import { editorAnimationCatalog } from '@/lib/modern-editor-animation-catalog';
import { getAnimationPreviewClassName, getAnimationPreviewMotionState } from './animation-preview';

describe('animation preview classes', () => {
  it('keeps animation presets idle until the user plays the preview', () => {
    const pulsePreset = getPreset('text-loop-pulse');

    expect(getAnimationPreviewClassName(pulsePreset, false)).not.toContain('animate-pulse');
    expect(getAnimationPreviewClassName(pulsePreset, true)).toContain('will-change-transform');
    expect(getAnimationPreviewClassName(pulsePreset, true)).not.toContain('text-base');
  });

  it('does not move one-shot enter animations in idle previews', () => {
    const fadePreset = getPreset('text-in-fade');
    const idleState = getAnimationPreviewMotionState(fadePreset, false);
    const playingState = getAnimationPreviewMotionState(fadePreset, true);

    expect(idleState.initial.opacity).toBe(1);
    expect(playingState.initial.opacity).toBe(0);
    expect(playingState.animate.opacity).toBe(1);
  });

  it('loops active preview animations until another preset becomes active', () => {
    const fadePreset = getPreset('text-in-fade');
    const playingState = getAnimationPreviewMotionState(fadePreset, true);

    expect(playingState.transition.repeat).toBe(Number.POSITIVE_INFINITY);
  });

  it('creates visible motion for loop previews', () => {
    const shakePreset = getPreset('text-loop-shake');
    const playingState = getAnimationPreviewMotionState(shakePreset, true);

    expect(playingState.animate.x).toEqual([0, -10, 10, -8, 8, 0]);
  });
});

function getPreset(id: string) {
  const preset = editorAnimationCatalog.find((item) => item.id === id);
  if (!preset) {
    throw new Error(`Missing animation preset: ${id}`);
  }

  return preset;
}
