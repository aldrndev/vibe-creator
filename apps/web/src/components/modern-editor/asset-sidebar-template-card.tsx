import { Captions, Megaphone, Plus, Sparkles, Type } from 'lucide-react';
import type { CSSProperties } from 'react';
import type {
  VideoStudioTextAction,
  VideoStudioTextPreviewVariant,
} from '@/lib/modern-editor-quick-actions';
import { cn } from '@/lib/utils';

const PRESET_THUMBNAIL_FONT_SCALE = 0.34;
const PRESET_THUMBNAIL_MIN_FONT_SIZE = 6;
const PRESET_THUMBNAIL_MAX_FONT_SIZE = 18;
const PRESET_THUMBNAIL_COMPACT_HEIGHT = 112;
const PRESET_THUMBNAIL_COMFORTABLE_HEIGHT = 124;
const PRESET_THUMBNAIL_APPROX_WIDTH = 268;
const PRESET_THUMBNAIL_AVERAGE_CHAR_WIDTH = 1.08;
const PRESET_THUMBNAIL_WIDTH_SAFETY = 0.76;
const PRESET_THUMBNAIL_HEIGHT_SAFETY = 0.82;
const PRESET_THUMBNAIL_LINE_HEIGHT = 1.12;

type PresetSceneKey =
  | 'hero'
  | 'question'
  | 'news'
  | 'checklist'
  | 'editorial'
  | 'clean'
  | 'minimal'
  | 'caption'
  | 'keyword'
  | 'outro'
  | 'interview'
  | 'quote'
  | 'social'
  | 'focus'
  | 'strip';

const presetSceneByActionId: Record<VideoStudioTextAction['id'], PresetSceneKey> = {
  opening: 'hero',
  'opening-question': 'question',
  'opening-breaking': 'news',
  'opening-countdown': 'checklist',
  title: 'editorial',
  'title-clean': 'clean',
  'title-minimal': 'minimal',
  caption: 'caption',
  'caption-clean': 'caption',
  'caption-keyword': 'keyword',
  closing: 'outro',
  'closing-follow': 'social',
  'closing-save': 'social',
  'closing-next': 'outro',
  'lower-third': 'interview',
  'lower-third-host': 'interview',
  'lower-third-topic': 'interview',
  quote: 'quote',
  'quote-soft': 'quote',
  'quote-bold': 'quote',
  cta: 'social',
  'cta-comment': 'social',
  'cta-save': 'social',
  highlight: 'focus',
  'highlight-soft': 'focus',
  'highlight-warning': 'focus',
  marker: 'focus',
  'marker-dot': 'focus',
  'marker-alert': 'focus',
  strip: 'strip',
  'strip-top': 'strip',
  'strip-bottom': 'strip',
};

interface TemplatePresetCardProps {
  readonly action: VideoStudioTextAction;
  readonly density?: 'comfortable' | 'compact';
  readonly onAdd: (action: VideoStudioTextAction) => void;
}

/**
 * Visual preset card for one-click text and element templates.
 */
export function TemplatePresetCard({
  action,
  density = 'comfortable',
  onAdd,
}: TemplatePresetCardProps) {
  return (
    <button
      type="button"
      aria-label={`Tambah preset ${action.label}`}
      onClick={() => onAdd(action)}
      className={cn(
        'group w-full overflow-hidden rounded-xl border border-border/45 bg-card/55 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:bg-card/75 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:translate-y-0 active:scale-[0.98]',
        density === 'compact' ? 'p-2' : 'p-2.5',
      )}
    >
      <PresetThumbnail action={action} density={density} />

      <div className="mt-2.5 flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <PresetIcon variant={action.preview.variant} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-black leading-tight tracking-tight text-foreground">
              {action.label}
            </p>
            <span className="rounded-full border border-border/50 bg-muted/30 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/80">
              {action.preview.badge}
            </span>
          </div>
          <p className="line-clamp-2 text-[10px] font-semibold leading-snug text-muted-foreground/70">
            {action.description}
          </p>
        </div>
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/40 text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
          <Plus size={13} />
        </div>
      </div>
    </button>
  );
}

function PresetThumbnail({
  action,
  density,
}: Readonly<{
  action: VideoStudioTextAction;
  density: 'comfortable' | 'compact';
}>) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-white/10 shadow-inner',
        density === 'compact' ? 'h-28' : 'h-[124px]',
      )}
    >
      <PresetScene action={action} />
      <div aria-hidden="true" style={getPresetLayerStyle(action, density)}>
        {action.text}
      </div>
    </div>
  );
}

function PresetIcon({ variant }: Readonly<{ variant: VideoStudioTextPreviewVariant }>) {
  if (variant === 'caption') {
    return <Captions size={16} />;
  }

  if (variant === 'cta' || variant === 'closing') {
    return <Megaphone size={16} />;
  }

  if (variant === 'hook' || variant === 'title') {
    return <Sparkles size={16} />;
  }

  return <Type size={16} />;
}

function getPresetLayerStyle(
  action: VideoStudioTextAction,
  density: 'comfortable' | 'compact',
): CSSProperties {
  return {
    position: 'absolute',
    left: `${action.x - action.width / 2}%`,
    top: `${action.y - action.height / 2}%`,
    width: `${action.width}%`,
    height: `${action.height}%`,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: getJustifyContent(action.data.textAlign),
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    lineHeight: PRESET_THUMBNAIL_LINE_HEIGHT,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize: getPresetThumbnailFontSize(action, density),
    fontWeight: action.data.fontWeight === 'bold' ? 800 : 500,
    color: action.data.color,
    backgroundColor: action.data.backgroundColor ?? 'transparent',
    textAlign: action.data.textAlign,
    paddingInline: action.width <= 12 ? 0 : 6,
    opacity: 1,
    textOverflow: 'clip',
    zIndex: 2,
  };
}

function getJustifyContent(textAlign: VideoStudioTextAction['data']['textAlign']) {
  if (textAlign === 'left') {
    return 'flex-start';
  }

  if (textAlign === 'right') {
    return 'flex-end';
  }

  return 'center';
}

function getPresetThumbnailFontSize(
  action: VideoStudioTextAction,
  density: 'comfortable' | 'compact',
) {
  const thumbnailHeight =
    density === 'compact' ? PRESET_THUMBNAIL_COMPACT_HEIGHT : PRESET_THUMBNAIL_COMFORTABLE_HEIGHT;
  const layerHeightPx = ((thumbnailHeight * action.height) / 100) * PRESET_THUMBNAIL_HEIGHT_SAFETY;
  const layerWidthPx =
    ((PRESET_THUMBNAIL_APPROX_WIDTH * action.width) / 100 - (action.width <= 12 ? 0 : 12)) *
    PRESET_THUMBNAIL_WIDTH_SAFETY;
  const textLength = Math.max(action.text.trim().length, 1);
  const maxFontSizeByHeight = layerHeightPx / PRESET_THUMBNAIL_LINE_HEIGHT;
  const maxFontSizeByWidth = layerWidthPx / (textLength * PRESET_THUMBNAIL_AVERAGE_CHAR_WIDTH);
  const scaledFontSize = action.data.fontSize * PRESET_THUMBNAIL_FONT_SCALE;

  return Math.max(
    PRESET_THUMBNAIL_MIN_FONT_SIZE,
    Math.min(
      PRESET_THUMBNAIL_MAX_FONT_SIZE,
      scaledFontSize,
      maxFontSizeByHeight,
      maxFontSizeByWidth,
    ),
  );
}

function PresetScene({ action }: Readonly<{ action: VideoStudioTextAction }>) {
  const scene = presetSceneByActionId[action.id];

  return (
    <div className="pointer-events-none absolute inset-0" style={getSceneBackground(scene)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.18))]" />
      <SceneDecor scene={scene} />
    </div>
  );
}

function SceneDecor({ scene }: Readonly<{ scene: PresetSceneKey }>) {
  switch (scene) {
    case 'hero':
      return <HeroScene />;
    case 'question':
      return <QuestionScene />;
    case 'news':
      return <NewsScene />;
    case 'checklist':
      return <ChecklistScene />;
    case 'editorial':
      return <EditorialScene />;
    case 'clean':
      return <CleanScene />;
    case 'minimal':
      return <MinimalScene />;
    case 'caption':
      return <CaptionScene />;
    case 'keyword':
      return <KeywordScene />;
    case 'outro':
      return <OutroScene />;
    case 'interview':
      return <InterviewScene />;
    case 'quote':
      return <QuoteScene />;
    case 'social':
      return <SocialScene />;
    case 'focus':
      return <FocusScene />;
    case 'strip':
      return <StripScene />;
  }
}

function HeroScene() {
  return (
    <>
      <div className="absolute bottom-0 right-4 h-24 w-20 rounded-t-full bg-white/18" />
      <div className="absolute bottom-8 right-11 h-10 w-10 rounded-full bg-white/24" />
      <div className="absolute bottom-4 left-5 h-2 w-24 rounded-full bg-white/18" />
      <div className="absolute bottom-9 left-5 h-2 w-14 rounded-full bg-white/12" />
    </>
  );
}

function QuestionScene() {
  return (
    <>
      <div className="absolute left-5 top-12 h-10 w-28 rounded-2xl bg-white/14" />
      <div className="absolute right-5 bottom-6 h-9 w-24 rounded-2xl bg-white/10" />
      <div className="absolute bottom-6 left-6 h-8 w-8 rounded-full bg-white/18" />
      <div className="absolute right-8 top-7 h-6 w-16 rounded-full bg-white/10" />
    </>
  );
}

function NewsScene() {
  return (
    <>
      <div className="absolute left-4 top-5 h-12 w-20 rounded-lg bg-white/12" />
      <div className="absolute right-5 top-6 h-2 w-24 rounded-full bg-white/16" />
      <div className="absolute right-5 top-11 h-2 w-16 rounded-full bg-white/10" />
      <div className="absolute inset-x-0 bottom-0 h-7 bg-white/12" />
    </>
  );
}

function ChecklistScene() {
  return (
    <>
      <div className="absolute left-5 top-8 h-20 w-28 rounded-xl bg-white/12" />
      <div className="absolute left-9 top-12 h-2 w-16 rounded-full bg-white/18" />
      <div className="absolute left-9 top-16 h-2 w-20 rounded-full bg-white/12" />
      <div className="absolute right-7 bottom-7 h-14 w-16 rounded-xl bg-white/10" />
    </>
  );
}

function EditorialScene() {
  return (
    <>
      <div className="absolute left-5 top-5 h-24 w-20 rounded-xl bg-white/12" />
      <div className="absolute right-6 top-9 h-2 w-24 rounded-full bg-white/18" />
      <div className="absolute right-6 top-14 h-2 w-16 rounded-full bg-white/10" />
      <div className="absolute right-6 bottom-8 h-8 w-28 rounded-lg border border-white/12" />
    </>
  );
}

function CleanScene() {
  return (
    <>
      <div className="absolute inset-4 rounded-2xl bg-white/12" />
      <div className="absolute left-8 bottom-8 h-2 w-28 rounded-full bg-slate-900/18" />
      <div className="absolute right-8 top-8 h-10 w-10 rounded-full bg-slate-900/10" />
    </>
  );
}

function MinimalScene() {
  return (
    <>
      <div className="absolute left-8 right-8 top-1/2 h-px bg-white/16" />
      <div className="absolute bottom-8 right-8 h-9 w-24 rounded-full border border-white/12" />
    </>
  );
}

function CaptionScene() {
  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/18" />
      <div className="absolute bottom-10 left-8 h-10 w-10 rounded-full bg-white/18" />
      <div className="absolute bottom-12 right-8 h-2 w-24 rounded-full bg-white/14" />
    </>
  );
}

function KeywordScene() {
  return (
    <>
      <div className="absolute left-6 top-7 h-20 w-20 rounded-2xl bg-white/10" />
      <div className="absolute right-7 bottom-7 h-12 w-28 rounded-xl bg-black/12" />
    </>
  );
}

function OutroScene() {
  return (
    <>
      <div className="absolute left-1/2 top-7 h-12 w-12 -translate-x-1/2 rounded-full bg-white/16" />
      <div className="absolute bottom-8 left-1/2 h-9 w-32 -translate-x-1/2 rounded-full bg-white/12" />
    </>
  );
}

function InterviewScene() {
  return (
    <>
      <div className="absolute bottom-0 left-4 h-24 w-20 rounded-t-full bg-white/14" />
      <div className="absolute bottom-12 left-10 h-9 w-9 rounded-full bg-white/20" />
      <div className="absolute right-8 top-9 h-2 w-28 rounded-full bg-white/14" />
      <div className="absolute right-8 top-14 h-2 w-20 rounded-full bg-white/10" />
    </>
  );
}

function QuoteScene() {
  return (
    <>
      <div className="absolute inset-5 rounded-2xl border border-white/14 bg-white/8" />
      <div className="absolute left-8 top-7 text-3xl font-black text-white/18">“</div>
      <div className="absolute bottom-8 right-8 h-2 w-20 rounded-full bg-white/14" />
    </>
  );
}

function SocialScene() {
  return (
    <>
      <div className="absolute left-5 top-5 h-20 w-20 rounded-2xl bg-white/12" />
      <div className="absolute right-6 top-8 h-4 w-24 rounded-full bg-white/12" />
      <div className="absolute right-6 top-14 h-4 w-20 rounded-full bg-white/10" />
      <div className="absolute bottom-6 right-7 h-8 w-8 rounded-full bg-white/16" />
    </>
  );
}

function FocusScene() {
  return (
    <>
      <div className="absolute inset-5 rounded-2xl border border-white/12" />
      <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/18" />
      <div className="absolute bottom-7 left-7 h-2 w-24 rounded-full bg-white/12" />
    </>
  );
}

function StripScene() {
  return (
    <>
      <div className="absolute inset-x-5 top-6 h-12 rounded-xl bg-white/10" />
      <div className="absolute inset-x-8 bottom-7 h-8 rounded-full border border-white/12" />
    </>
  );
}

function getSceneBackground(scene: PresetSceneKey): CSSProperties {
  const backgrounds: Record<PresetSceneKey, string> = {
    hero: 'linear-gradient(135deg, #2f211b 0%, #6d4b35 48%, #1f2933 100%)',
    question: 'linear-gradient(135deg, #263244 0%, #48556b 48%, #27233a 100%)',
    news: 'linear-gradient(135deg, #33272a 0%, #624042 46%, #1f2933 100%)',
    checklist: 'linear-gradient(135deg, #2d3442 0%, #5c5840 48%, #24303c 100%)',
    editorial: 'linear-gradient(135deg, #252a34 0%, #545f72 48%, #222831 100%)',
    clean: 'linear-gradient(135deg, #d8d1c3 0%, #aeb7ba 48%, #7b8790 100%)',
    minimal: 'linear-gradient(135deg, #29323a 0%, #4b5563 50%, #202632 100%)',
    caption: 'linear-gradient(135deg, #27313f 0%, #3e4d5c 48%, #1e2733 100%)',
    keyword: 'linear-gradient(135deg, #3a3326 0%, #756645 48%, #28313a 100%)',
    outro: 'linear-gradient(135deg, #203227 0%, #3f6652 48%, #202833 100%)',
    interview: 'linear-gradient(135deg, #272c35 0%, #5a4b43 48%, #202833 100%)',
    quote: 'linear-gradient(135deg, #2f293d 0%, #5c526b 48%, #242936 100%)',
    social: 'linear-gradient(135deg, #243041 0%, #52677a 50%, #29313d 100%)',
    focus: 'linear-gradient(135deg, #2c3036 0%, #5a5142 48%, #222936 100%)',
    strip: 'linear-gradient(135deg, #252d35 0%, #46515c 50%, #202832 100%)',
  };

  return { background: backgrounds[scene] };
}
