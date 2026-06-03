import { describe, expect, it } from 'vitest';
import { resolveCommunityLink } from './community-links';

describe('resolveCommunityLink', () => {
  it('uses a valid fallback link when env value is missing', () => {
    expect(resolveCommunityLink(undefined, 'https://t.me/vibecreator_id')).toEqual({
      href: 'https://t.me/vibecreator_id',
      isAvailable: true,
    });
  });

  it('rejects placeholder links', () => {
    expect(resolveCommunityLink('https://chat.whatsapp.com/your-group-link')).toMatchObject({
      href: null,
      isAvailable: false,
    });
  });

  it('rejects non-https links', () => {
    expect(resolveCommunityLink('http://chat.whatsapp.com/invite')).toMatchObject({
      href: null,
      isAvailable: false,
    });
  });

  it('accepts configured https links', () => {
    expect(resolveCommunityLink('https://chat.whatsapp.com/realInviteCode')).toEqual({
      href: 'https://chat.whatsapp.com/realInviteCode',
      isAvailable: true,
    });
  });
});
