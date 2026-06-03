import { describe, expect, it } from 'vitest';
import { buildDrawtextFilter } from './text-overlay-filter';

const baseOverlay = {
  content: "Let's go: now",
  startMs: 2000,
  endMs: 6000,
  x: 50,
  y: 72,
  fontSize: 64,
  fontFamily: 'Inter',
  fontWeight: 'bold',
  color: '#ffffff',
};

describe('text overlay FFmpeg filter', () => {
  it('builds a static drawtext filter for non-animated overlays', () => {
    const filter = buildDrawtextFilter(
      {
        ...baseOverlay,
        animation: 'none',
      },
      '/tmp/fonts/Inter-Bold.ttf',
    );

    expect(filter).toContain("drawtext=text='Let\\'s go\\: now'");
    expect(filter).toContain(':x=(w*50/100)-(text_w/2)');
    expect(filter).toContain(':y=(h*72/100)-(text_h/2)');
    expect(filter).toContain(':fontfile=/tmp/fonts/Inter-Bold.ttf');
    expect(filter).not.toContain(':alpha=');
  });

  it('adds fade alpha for fade overlays', () => {
    const fadeFilter = buildDrawtextFilter(
      {
        ...baseOverlay,
        animation: 'fade',
      },
      null,
    );

    expect(fadeFilter).toContain(":alpha='if(lt(t\\,2.500)\\,(t-2)/0.5\\,1)'");
  });

  it('builds incremental prefix filters for typewriter overlays', () => {
    const filter = buildDrawtextFilter(
      {
        ...baseOverlay,
        content: 'Go!',
        animation: 'typewriter',
      },
      null,
    );

    expect(filter.match(/drawtext=/g) ?? []).toHaveLength(3);
    expect(filter).toContain("drawtext=text='G'");
    expect(filter).toContain("drawtext=text='Go'");
    expect(filter).toContain("drawtext=text='Go!'");
    expect(filter).toContain(":enable='between(t\\,2.000\\,2.150)'");
    expect(filter).toContain(":enable='between(t\\,2.150\\,2.300)'");
    expect(filter).toContain(":enable='between(t\\,2.300\\,6.000)'");
    expect(filter).not.toContain(':alpha=');
  });

  it('adds animated y expressions for slide text overlays', () => {
    const slideUpFilter = buildDrawtextFilter(
      {
        ...baseOverlay,
        animation: 'slide-up',
      },
      null,
    );
    const slideDownFilter = buildDrawtextFilter(
      {
        ...baseOverlay,
        animation: 'slide-down',
      },
      null,
    );

    expect(slideUpFilter).toContain(
      ':y=if(lt(t\\,2.500)\\,(h*72/100)-(text_h/2)+20*(1-(t-2)/0.5)\\,(h*72/100)-(text_h/2))',
    );
    expect(slideDownFilter).toContain(
      ':y=if(lt(t\\,2.500)\\,(h*72/100)-(text_h/2)-20*(1-(t-2)/0.5)\\,(h*72/100)-(text_h/2))',
    );
  });

  it('supports explicit animation in and out fields', () => {
    const filter = buildDrawtextFilter(
      {
        ...baseOverlay,
        animation: 'none',
        animationIn: 'pop',
        animationOut: 'shrink',
        animationLoop: 'pulse',
      },
      null,
    );

    expect(filter).toContain(":fontsize='if(lt(t\\,2.500)\\,64*(0.78+(1-0.78)*(t-2)/0.5)\\,64)'");
    expect(filter).toContain(":alpha='min(min(if(lt(t\\,2.500)\\,(t-2)/0.5\\,1)");
    expect(filter).toContain('(0.88+0.12*(sin(t*6.283)+1)/2)');
  });

  it('exports shake loop animation as a horizontal motion expression', () => {
    const filter = buildDrawtextFilter(
      {
        ...baseOverlay,
        animationLoop: 'shake',
      },
      null,
    );

    expect(filter).toContain(':x=(w*50/100)-(text_w/2)+6*sin(t*34)');
  });

  it('uses explicit text opacity and background opacity', () => {
    const filter = buildDrawtextFilter(
      {
        ...baseOverlay,
        opacity: 0.6,
        backgroundColor: '#000000',
        backgroundOpacity: 0.35,
      },
      null,
    );

    expect(filter).toContain(":alpha='0.6'");
    expect(filter).toContain(':box=1:boxcolor=0x000000@0.35:boxborderw=10');
  });

  it('maps text alignment to anchor-aware x expressions', () => {
    const leftFilter = buildDrawtextFilter({ ...baseOverlay, textAlign: 'left' }, null);
    const rightFilter = buildDrawtextFilter({ ...baseOverlay, textAlign: 'right' }, null);

    expect(leftFilter).toContain(':x=(w*50/100)');
    expect(rightFilter).toContain(':x=(w*50/100)-text_w');
  });
});
