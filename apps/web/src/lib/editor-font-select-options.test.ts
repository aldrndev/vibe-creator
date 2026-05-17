import { EDITOR_FONT_CATEGORY_VALUES } from '@vibe-creator/shared';
import { describe, expect, it } from 'vitest';
import { getEditorFontSelectGroups } from '@/lib/editor-font-select-options';

describe('editor font select options', () => {
  it('groups all editor fonts by category with category labels', () => {
    const groups = getEditorFontSelectGroups('');

    expect(groups.map((group) => group.category)).toEqual(EDITOR_FONT_CATEGORY_VALUES);
    expect(groups.flatMap((group) => group.fonts)).toHaveLength(24);
    expect(groups.every((group) => group.label.length > 0)).toBe(true);
  });

  it('filters fonts by family and category label', () => {
    const familyMatches = getEditorFontSelectGroups('bangers').flatMap((group) => group.fonts);
    const categoryMatches = getEditorFontSelectGroups('creator').flatMap((group) => group.fonts);

    expect(familyMatches.map((font) => font.family)).toEqual(['Bangers']);
    expect(
      categoryMatches.map((font) => font.category).every((category) => category === 'creator-bold'),
    ).toBe(true);
  });

  it('returns no group when query has no match', () => {
    expect(getEditorFontSelectGroups('not-a-real-font')).toEqual([]);
  });
});
