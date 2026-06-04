import { describe, expect, it } from 'vitest';
import { dashboardQuickActions, getDashboardToolLabel } from './dashboard-home';

describe('dashboard home config', () => {
  it('uses canonical tool routes for quick actions', () => {
    const routes = dashboardQuickActions.map((action) => action.href);

    expect(routes).toContain('/tools/ai-director');
    expect(routes).toContain('/tools/video-studio');
    expect(routes).toContain('/tools/loop-creator');
    expect(routes).toContain('/tools/reaction');
    expect(routes).toContain('/tools/live-stream-history');
    expect(routes).not.toContain('/tools/reaction-creator');
    expect(routes).not.toContain('/tools/live-stream');
  });

  it('uses current product labels', () => {
    expect(dashboardQuickActions.map((action) => action.title)).toContain('Reaction Recorder');
    expect(dashboardQuickActions.map((action) => action.description).join(' ')).not.toMatch(/GIF/i);
    expect(getDashboardToolLabel('reaction-video')).toBe('Reaction');
  });
});
