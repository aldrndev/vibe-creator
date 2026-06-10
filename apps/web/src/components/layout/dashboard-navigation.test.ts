import { describe, expect, it } from 'vitest';
import { dashboardNavigation } from '@/components/layout/dashboard-navigation';

describe('dashboardNavigation', () => {
  it('shows permanent creator tools and hides deprecated entries', () => {
    const visibleLinks = dashboardNavigation.flatMap((item) =>
      'children' in item ? item.children.map((child) => child.href) : [item.href],
    );

    expect(visibleLinks).toContain('/tools/ai-director');
    expect(visibleLinks).toContain('/tools/video-studio');
    expect(visibleLinks).toContain('/dashboard/prompts');
    expect(visibleLinks).not.toContain('/tools/editor');
  });
});
