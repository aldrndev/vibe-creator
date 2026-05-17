import {
  EDITOR_FONT_CATALOG,
  EDITOR_FONT_CATEGORY_LABELS,
  EDITOR_FONT_CATEGORY_VALUES,
  type EditorFontCategory,
  type EditorFontDefinition,
} from '@vibe-creator/shared';

export interface EditorFontSelectGroup {
  readonly category: EditorFontCategory;
  readonly label: string;
  readonly fonts: readonly EditorFontDefinition[];
}

export function getEditorFontSelectGroups(query: string): readonly EditorFontSelectGroup[] {
  const normalizedQuery = query.trim().toLowerCase();

  return EDITOR_FONT_CATEGORY_VALUES.map((category) => {
    const categoryLabel = EDITOR_FONT_CATEGORY_LABELS[category];
    const fonts = EDITOR_FONT_CATALOG.filter((font) => {
      if (font.category !== category) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return `${font.family} ${font.label} ${categoryLabel}`
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return {
      category,
      label: categoryLabel,
      fonts,
    };
  }).filter((group) => group.fonts.length > 0);
}
