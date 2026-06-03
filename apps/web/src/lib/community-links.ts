import { z } from 'zod';

const communityUrlSchema = z.string().trim().url();

const PLACEHOLDER_MARKERS = ['your-group-link', 'example.com', 'changeme', 'placeholder'];

export interface ResolvedCommunityLink {
  readonly href: string | null;
  readonly isAvailable: boolean;
  readonly unavailableReason?: string;
}

export function resolveCommunityLink(
  rawUrl: string | undefined,
  fallbackUrl?: string,
): ResolvedCommunityLink {
  const candidate = rawUrl?.trim() || fallbackUrl?.trim() || '';
  const parsed = communityUrlSchema.safeParse(candidate);

  if (!parsed.success) {
    return {
      href: null,
      isAvailable: false,
      unavailableReason: 'Link belum dikonfigurasi.',
    };
  }

  const href = parsed.data;
  const lowerHref = href.toLowerCase();

  if (PLACEHOLDER_MARKERS.some((marker) => lowerHref.includes(marker))) {
    return {
      href: null,
      isAvailable: false,
      unavailableReason: 'Link masih memakai placeholder.',
    };
  }

  const url = new URL(href);
  if (url.protocol !== 'https:') {
    return {
      href: null,
      isAvailable: false,
      unavailableReason: 'Link harus memakai HTTPS.',
    };
  }

  return {
    href,
    isAvailable: true,
  };
}
