/**
 * Font Registry and Embedding System
 * Ensures canvas preview matches FFmpeg export output
 */

export interface FontDefinition {
  id: string;
  name: string;
  family: string;
  weights: number[];
  styles: ('normal' | 'italic')[];
  /** Google Fonts URL or local file path */
  source: 'google' | 'local';
  /** For FFmpeg - path to font file on server */
  ffmpegPath?: string;
}

/**
 * Available fonts for text overlays
 * All fonts must have corresponding TTF/OTF files on server for FFmpeg export
 */
export const FONT_REGISTRY: FontDefinition[] = [
  {
    id: 'inter',
    name: 'Inter',
    family: 'Inter',
    weights: [400, 500, 600, 700],
    styles: ['normal'],
    source: 'google',
    ffmpegPath: '/fonts/Inter-Regular.ttf',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    family: 'Roboto',
    weights: [400, 500, 700],
    styles: ['normal', 'italic'],
    source: 'google',
    ffmpegPath: '/fonts/Roboto-Regular.ttf',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    family: 'Poppins',
    weights: [400, 500, 600, 700],
    styles: ['normal'],
    source: 'google',
    ffmpegPath: '/fonts/Poppins-Regular.ttf',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    family: 'Montserrat',
    weights: [400, 500, 600, 700],
    styles: ['normal', 'italic'],
    source: 'google',
    ffmpegPath: '/fonts/Montserrat-Regular.ttf',
  },
  {
    id: 'open-sans',
    name: 'Open Sans',
    family: 'Open Sans',
    weights: [400, 600, 700],
    styles: ['normal', 'italic'],
    source: 'google',
    ffmpegPath: '/fonts/OpenSans-Regular.ttf',
  },
  {
    id: 'oswald',
    name: 'Oswald',
    family: 'Oswald',
    weights: [400, 500, 700],
    styles: ['normal'],
    source: 'google',
    ffmpegPath: '/fonts/Oswald-Regular.ttf',
  },
  {
    id: 'playfair-display',
    name: 'Playfair Display',
    family: 'Playfair Display',
    weights: [400, 500, 600, 700],
    styles: ['normal', 'italic'],
    source: 'google',
    ffmpegPath: '/fonts/PlayfairDisplay-Regular.ttf',
  },
  {
    id: 'bebas-neue',
    name: 'Bebas Neue',
    family: 'Bebas Neue',
    weights: [400],
    styles: ['normal'],
    source: 'google',
    ffmpegPath: '/fonts/BebasNeue-Regular.ttf',
  },
];

/**
 * Load a Google Font dynamically
 */
export async function loadGoogleFont(familyName: string): Promise<void> {
  // Check if already loaded
  const existingLink = document.querySelector(
    `link[href*="${encodeURIComponent(familyName)}"]`
  );
  if (existingLink) return;

  const weights = getFontWeights(familyName);
  const weightString = weights.join(';');
  
  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(familyName)}:wght@${weightString}&display=swap`;
  link.rel = 'stylesheet';
  
  return new Promise((resolve, reject) => {
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load font: ${familyName}`));
    document.head.appendChild(link);
  });
}

/**
 * Get available weights for a font
 */
export function getFontWeights(familyName: string): number[] {
  const font = FONT_REGISTRY.find(f => f.family === familyName);
  return font?.weights ?? [400];
}

/**
 * Get font by ID
 */
export function getFontById(id: string): FontDefinition | undefined {
  return FONT_REGISTRY.find(f => f.id === id);
}

/**
 * Get font by family name
 */
export function getFontByFamily(family: string): FontDefinition | undefined {
  return FONT_REGISTRY.find(f => f.family === family);
}

/**
 * Preload all fonts used in text overlays
 */
export async function preloadFontsForOverlays(
  fontFamilies: string[]
): Promise<void> {
  const uniqueFamilies = [...new Set(fontFamilies)];
  
  await Promise.all(
    uniqueFamilies.map(family => loadGoogleFont(family).catch(() => {
      // Font loading failed, silently continue
    }))
  );
}

/**
 * Check if a font is loaded and available
 */
export function isFontLoaded(familyName: string): boolean {
  return document.fonts.check(`16px "${familyName}"`);
}

/**
 * Wait for a specific font to load
 */
export async function waitForFont(familyName: string, timeoutMs = 5000): Promise<boolean> {
  if (isFontLoaded(familyName)) return true;
  
  await loadGoogleFont(familyName);
  
  return new Promise(resolve => {
    const startTime = Date.now();
    
    const check = () => {
      if (isFontLoaded(familyName)) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeoutMs) {
        resolve(false);
        return;
      }
      
      requestAnimationFrame(check);
    };
    
    check();
  });
}
