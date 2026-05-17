/**
 * Shared Google Font catalog for Video Studio text layers and AI Director subtitles.
 * The file names are intentionally stable because web preview and FFmpeg export
 * both resolve assets from this catalog.
 */

export const EDITOR_FONT_CATEGORY_VALUES = [
  'creator-bold',
  'modern-clean',
  'tech-editorial',
  'caption-subtitle',
  'fun-meme',
] as const;

export type EditorFontCategory = (typeof EDITOR_FONT_CATEGORY_VALUES)[number];

export const EDITOR_FONT_CATEGORY_LABELS: Record<EditorFontCategory, string> = {
  'creator-bold': 'Creator Bold',
  'modern-clean': 'Modern Clean',
  'tech-editorial': 'Tech / Editorial',
  'caption-subtitle': 'Caption / Subtitles',
  'fun-meme': 'Fun / Meme',
};

export interface EditorFontDefinition {
  readonly id: string;
  readonly family: string;
  readonly label: string;
  readonly category: EditorFontCategory;
  readonly defaultWeight: number;
  readonly availableWeights: readonly number[];
  readonly fallbackFamily: string;
  readonly regularFile: string;
  readonly boldFile: string;
}

export const DEFAULT_EDITOR_FONT_FAMILY = 'Inter';

export const EDITOR_FONT_CATALOG = [
  {
    id: 'bebas-neue',
    family: 'Bebas Neue',
    label: 'Bebas Neue',
    category: 'creator-bold',
    defaultWeight: 400,
    availableWeights: [400],
    fallbackFamily: 'Arial Black, Impact, sans-serif',
    regularFile: 'bebas-neue-regular.ttf',
    boldFile: 'bebas-neue-bold.ttf',
  },
  {
    id: 'anton',
    family: 'Anton',
    label: 'Anton',
    category: 'creator-bold',
    defaultWeight: 400,
    availableWeights: [400],
    fallbackFamily: 'Arial Black, Impact, sans-serif',
    regularFile: 'anton-regular.ttf',
    boldFile: 'anton-bold.ttf',
  },
  {
    id: 'archivo-black',
    family: 'Archivo Black',
    label: 'Archivo Black',
    category: 'creator-bold',
    defaultWeight: 400,
    availableWeights: [400],
    fallbackFamily: 'Arial Black, Impact, sans-serif',
    regularFile: 'archivo-black-regular.ttf',
    boldFile: 'archivo-black-bold.ttf',
  },
  {
    id: 'oswald',
    family: 'Oswald',
    label: 'Oswald',
    category: 'creator-bold',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Arial Narrow, Arial, sans-serif',
    regularFile: 'oswald-regular.ttf',
    boldFile: 'oswald-bold.ttf',
  },
  {
    id: 'league-spartan',
    family: 'League Spartan',
    label: 'League Spartan',
    category: 'creator-bold',
    defaultWeight: 700,
    availableWeights: [400, 600, 700, 800],
    fallbackFamily: 'Arial Black, Arial, sans-serif',
    regularFile: 'league-spartan-regular.ttf',
    boldFile: 'league-spartan-bold.ttf',
  },
  {
    id: 'poppins',
    family: 'Poppins',
    label: 'Poppins',
    category: 'modern-clean',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'poppins-regular.ttf',
    boldFile: 'poppins-bold.ttf',
  },
  {
    id: 'montserrat',
    family: 'Montserrat',
    label: 'Montserrat',
    category: 'modern-clean',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'montserrat-regular.ttf',
    boldFile: 'montserrat-bold.ttf',
  },
  {
    id: 'inter',
    family: 'Inter',
    label: 'Inter',
    category: 'modern-clean',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'system-ui, sans-serif',
    regularFile: 'inter-regular.ttf',
    boldFile: 'inter-bold.ttf',
  },
  {
    id: 'dm-sans',
    family: 'DM Sans',
    label: 'DM Sans',
    category: 'modern-clean',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'dm-sans-regular.ttf',
    boldFile: 'dm-sans-bold.ttf',
  },
  {
    id: 'plus-jakarta-sans',
    family: 'Plus Jakarta Sans',
    label: 'Plus Jakarta Sans',
    category: 'modern-clean',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'plus-jakarta-sans-regular.ttf',
    boldFile: 'plus-jakarta-sans-bold.ttf',
  },
  {
    id: 'space-grotesk',
    family: 'Space Grotesk',
    label: 'Space Grotesk',
    category: 'tech-editorial',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'space-grotesk-regular.ttf',
    boldFile: 'space-grotesk-bold.ttf',
  },
  {
    id: 'sora',
    family: 'Sora',
    label: 'Sora',
    category: 'tech-editorial',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'sora-regular.ttf',
    boldFile: 'sora-bold.ttf',
  },
  {
    id: 'outfit',
    family: 'Outfit',
    label: 'Outfit',
    category: 'tech-editorial',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'outfit-regular.ttf',
    boldFile: 'outfit-bold.ttf',
  },
  {
    id: 'urbanist',
    family: 'Urbanist',
    label: 'Urbanist',
    category: 'tech-editorial',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'urbanist-regular.ttf',
    boldFile: 'urbanist-bold.ttf',
  },
  {
    id: 'barlow',
    family: 'Barlow',
    label: 'Barlow',
    category: 'tech-editorial',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'barlow-regular.ttf',
    boldFile: 'barlow-bold.ttf',
  },
  {
    id: 'roboto-condensed',
    family: 'Roboto Condensed',
    label: 'Roboto Condensed',
    category: 'caption-subtitle',
    defaultWeight: 700,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Arial Narrow, Arial, sans-serif',
    regularFile: 'roboto-condensed-regular.ttf',
    boldFile: 'roboto-condensed-bold.ttf',
  },
  {
    id: 'noto-sans',
    family: 'Noto Sans',
    label: 'Noto Sans',
    category: 'caption-subtitle',
    defaultWeight: 600,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'noto-sans-regular.ttf',
    boldFile: 'noto-sans-bold.ttf',
  },
  {
    id: 'manrope',
    family: 'Manrope',
    label: 'Manrope',
    category: 'caption-subtitle',
    defaultWeight: 700,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'manrope-regular.ttf',
    boldFile: 'manrope-bold.ttf',
  },
  {
    id: 'nunito-sans',
    family: 'Nunito Sans',
    label: 'Nunito Sans',
    category: 'caption-subtitle',
    defaultWeight: 700,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Inter, system-ui, sans-serif',
    regularFile: 'nunito-sans-regular.ttf',
    boldFile: 'nunito-sans-bold.ttf',
  },
  {
    id: 'bangers',
    family: 'Bangers',
    label: 'Bangers',
    category: 'fun-meme',
    defaultWeight: 400,
    availableWeights: [400],
    fallbackFamily: 'Impact, Arial Black, sans-serif',
    regularFile: 'bangers-regular.ttf',
    boldFile: 'bangers-bold.ttf',
  },
  {
    id: 'luckiest-guy',
    family: 'Luckiest Guy',
    label: 'Luckiest Guy',
    category: 'fun-meme',
    defaultWeight: 400,
    availableWeights: [400],
    fallbackFamily: 'Impact, Arial Black, sans-serif',
    regularFile: 'luckiest-guy-regular.ttf',
    boldFile: 'luckiest-guy-bold.ttf',
  },
  {
    id: 'permanent-marker',
    family: 'Permanent Marker',
    label: 'Permanent Marker',
    category: 'fun-meme',
    defaultWeight: 400,
    availableWeights: [400],
    fallbackFamily: 'Comic Sans MS, cursive',
    regularFile: 'permanent-marker-regular.ttf',
    boldFile: 'permanent-marker-bold.ttf',
  },
  {
    id: 'fredoka',
    family: 'Fredoka',
    label: 'Fredoka',
    category: 'fun-meme',
    defaultWeight: 700,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Arial Rounded MT Bold, Nunito, sans-serif',
    regularFile: 'fredoka-regular.ttf',
    boldFile: 'fredoka-bold.ttf',
  },
  {
    id: 'baloo-2',
    family: 'Baloo 2',
    label: 'Baloo 2',
    category: 'fun-meme',
    defaultWeight: 700,
    availableWeights: [400, 500, 600, 700],
    fallbackFamily: 'Arial Rounded MT Bold, Nunito, sans-serif',
    regularFile: 'baloo-2-regular.ttf',
    boldFile: 'baloo-2-bold.ttf',
  },
] as const satisfies readonly EditorFontDefinition[];

export type EditorFontFamily = (typeof EDITOR_FONT_CATALOG)[number]['family'];

export const EDITOR_FONT_COUNT = 24;

const LEGACY_EDITOR_FONT_FALLBACKS: Record<string, EditorFontFamily> = {
  arial: 'Inter',
  georgia: 'Noto Sans',
  impact: 'Anton',
  'times new roman': 'Noto Sans',
};

function normalizeFontLookup(value: string): string {
  return value.trim().toLowerCase();
}

export function isEditorFontFamily(fontFamily: string): fontFamily is EditorFontFamily {
  const normalizedFamily = normalizeFontLookup(fontFamily);
  return EDITOR_FONT_CATALOG.some((font) => normalizeFontLookup(font.family) === normalizedFamily);
}

export function getEditorFontByFamily(fontFamily: string): EditorFontDefinition | undefined {
  const normalizedFamily = normalizeFontLookup(fontFamily);
  return EDITOR_FONT_CATALOG.find((font) => normalizeFontLookup(font.family) === normalizedFamily);
}

export function getEditorFontById(id: string): EditorFontDefinition | undefined {
  const normalizedId = normalizeFontLookup(id);
  return EDITOR_FONT_CATALOG.find((font) => font.id === normalizedId);
}

export function resolveEditorFontFamily(fontFamily?: string | null): EditorFontFamily {
  if (!fontFamily) {
    return DEFAULT_EDITOR_FONT_FAMILY;
  }

  const directFont = getEditorFontByFamily(fontFamily);
  if (directFont) {
    return directFont.family as EditorFontFamily;
  }

  const legacyFallback = LEGACY_EDITOR_FONT_FALLBACKS[normalizeFontLookup(fontFamily)];
  return legacyFallback ?? DEFAULT_EDITOR_FONT_FAMILY;
}

export function resolveEditorFont(fontFamily?: string | null): EditorFontDefinition {
  const resolvedFamily = resolveEditorFontFamily(fontFamily);
  const defaultFont = getEditorFontByFamily(DEFAULT_EDITOR_FONT_FAMILY);
  if (!defaultFont) {
    throw new Error(`Default editor font is missing: ${DEFAULT_EDITOR_FONT_FAMILY}.`);
  }

  return getEditorFontByFamily(resolvedFamily) ?? defaultFont;
}

export function getEditorFontCssFamily(fontFamily?: string | null): string {
  const font = resolveEditorFont(fontFamily);
  return `"${font.family}", ${font.fallbackFamily}`;
}

export function getEditorFontFile(fontFamily?: string | null, bold = false): string {
  const font = resolveEditorFont(fontFamily);
  return bold ? font.boldFile : font.regularFile;
}

export function validateEditorFontCatalog(): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenFamilies = new Set<string>();

  if (EDITOR_FONT_CATALOG.length !== EDITOR_FONT_COUNT) {
    errors.push(`Expected ${EDITOR_FONT_COUNT} editor fonts, got ${EDITOR_FONT_CATALOG.length}.`);
  }

  for (const font of EDITOR_FONT_CATALOG) {
    if (seenIds.has(font.id)) {
      errors.push(`Duplicate editor font id: ${font.id}.`);
    }
    seenIds.add(font.id);

    const familyKey = normalizeFontLookup(font.family);
    if (seenFamilies.has(familyKey)) {
      errors.push(`Duplicate editor font family: ${font.family}.`);
    }
    seenFamilies.add(familyKey);

    if (!EDITOR_FONT_CATEGORY_VALUES.includes(font.category)) {
      errors.push(`Invalid editor font category for ${font.family}: ${font.category}.`);
    }
    if (!font.regularFile.endsWith('.ttf') || !font.boldFile.endsWith('.ttf')) {
      errors.push(`Editor font ${font.family} must reference TTF files.`);
    }
  }

  return errors;
}
