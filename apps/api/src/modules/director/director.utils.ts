/**
 * Director Utilities
 * Validation and helper functions
 */

export const ALLOWED_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'tiktok.com',
  'www.tiktok.com',
  'vm.tiktok.com',
  'instagram.com',
  'www.instagram.com',
  'facebook.com',
  'www.facebook.com',
  'fb.watch',
];

export function validateImportUrl(url: string): {
  valid: boolean;
  normalized?: string;
} {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return { valid: false };
    }

    // Normalize URL (keep query params for YouTube v=, but maybe strip known tracking if we wanted)
    // For now, just keep search params to ensure YouTube /watch?v= works
    const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`;
    return { valid: true, normalized };
  } catch {
    return { valid: false };
  }
}
