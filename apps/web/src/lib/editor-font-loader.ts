import {
  EDITOR_FONT_CATALOG,
  getEditorFontCssFamily,
  resolveEditorFontFamily,
} from '@vibe-creator/shared';

const EDITOR_FONT_STYLE_ID = 'vibe-editor-font-faces';
const EDITOR_FONT_PUBLIC_PATH = '/fonts/editor';

function escapeCssString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

function buildFontFaceRule(fontFamily: string, fileName: string, weight: number): string {
  const escapedFamily = escapeCssString(fontFamily);
  const escapedUrl = escapeCssString(`${EDITOR_FONT_PUBLIC_PATH}/${fileName}`);

  return [
    '@font-face {',
    `  font-family: "${escapedFamily}";`,
    `  src: url("${escapedUrl}") format("truetype");`,
    `  font-weight: ${weight};`,
    '  font-style: normal;',
    '  font-display: swap;',
    '}',
  ].join('\n');
}

export function registerEditorFontFaces(): void {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.getElementById(EDITOR_FONT_STYLE_ID)) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = EDITOR_FONT_STYLE_ID;
  styleElement.textContent = EDITOR_FONT_CATALOG.flatMap((font) => [
    buildFontFaceRule(font.family, font.regularFile, 400),
    buildFontFaceRule(font.family, font.boldFile, 700),
  ]).join('\n\n');
  document.head.appendChild(styleElement);
}

export function getEditorFontPreviewFamily(fontFamily?: string | null): string {
  return getEditorFontCssFamily(resolveEditorFontFamily(fontFamily));
}
