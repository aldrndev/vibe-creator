import { toFFmpegColor } from './ffmpeg-color';

const TEXT_ANIMATION_MAX_SEC = 0.5;
const TEXT_ANIMATION_MIN_SEC = 0.1;
const TEXT_SLIDE_DISTANCE_PX = 20;
const TEXT_SHAKE_DISTANCE_PX = 6;
const TEXT_BOX_BORDER_WIDTH = 10;
const TYPEWRITER_MIN_DURATION_SEC = 0.45;
const TYPEWRITER_MAX_DURATION_SEC = 1.6;
const TYPEWRITER_SEC_PER_CHARACTER = 0.035;
const TYPEWRITER_MAX_FILTER_STEPS = 120;

export type ModernTextAnimation = 'none' | 'fade' | 'slide-up' | 'slide-down' | 'typewriter';
export type ModernTextAnimationIn = ModernTextAnimation | 'pop' | 'zoom';
export type ModernTextAnimationOut = 'none' | 'fade-out' | 'slide-out' | 'shrink';
export type ModernTextAnimationLoop = 'none' | 'pulse' | 'shake' | 'glow';

export interface DrawtextOverlayInput {
  content: string;
  startMs: number;
  endMs: number;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  color: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  opacity?: number;
  rotation?: number;
  textAlign?: 'left' | 'center' | 'right';
  visible?: boolean;
  animation?: ModernTextAnimation;
  animationIn?: ModernTextAnimationIn;
  animationOut?: ModernTextAnimationOut;
  animationLoop?: ModernTextAnimationLoop;
}

export function buildDrawtextFilter(
  overlay: DrawtextOverlayInput,
  fontFile: string | null,
): string {
  const animationIn = overlay.animationIn ?? overlay.animation ?? 'none';

  if (animationIn === 'typewriter') {
    return buildTypewriterDrawtextFilters(overlay, fontFile).join(',');
  }

  const escapedText = escapeDrawtextText(overlay.content);
  const color = toFFmpegColor(overlay.color, 'white');
  const startSec = overlay.startMs / 1000;
  const endSec = overlay.endMs / 1000;
  const animationOut = overlay.animationOut ?? 'none';
  const animationLoop = overlay.animationLoop ?? 'none';

  let filter = `drawtext=text='${escapedText}'`;
  filter += `:x=${buildXExpression(overlay.x, overlay.textAlign ?? 'center', animationLoop)}`;
  filter += `:y=${buildYExpression(overlay.y, animationIn, animationOut, startSec, endSec)}`;
  filter += `:fontsize=${buildFontSizeExpression(overlay.fontSize, animationIn, animationOut, startSec, endSec)}`;
  filter += `:fontcolor=${color}`;

  const alphaExpression = buildAlphaExpression(
    animationIn,
    animationOut,
    animationLoop,
    startSec,
    endSec,
    overlay.opacity ?? 1,
  );
  if (alphaExpression) {
    filter += `:alpha='${alphaExpression}'`;
  }

  if (fontFile) {
    filter += `:fontfile=${escapeDrawtextValue(fontFile)}`;
  }

  filter += `:enable='between(t\\,${startSec}\\,${endSec})'`;

  if (overlay.backgroundColor) {
    const bgColor = toFFmpegColor(
      overlay.backgroundColor,
      'black',
      overlay.backgroundOpacity ?? 0.7,
    );
    filter += `:box=1:boxcolor=${bgColor}:boxborderw=${TEXT_BOX_BORDER_WIDTH}`;
  }

  return filter;
}

export function escapeDrawtextValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll(':', '\\:').replaceAll("'", "\\'");
}

function escapeDrawtextText(value: string): string {
  return value.replace(/[,:\\\\]/g, '\\$&').replace(/'/g, "\\'");
}

function buildAlphaExpression(
  animationIn: ModernTextAnimationIn,
  animationOut: ModernTextAnimationOut,
  animationLoop: ModernTextAnimationLoop,
  startSec: number,
  endSec: number,
  opacity: number,
): string | null {
  const expressions: string[] = [];
  const normalizedOpacity = normalizeOpacity(opacity);

  if (animationIn !== 'none' && animationIn !== 'typewriter') {
    const animationSec = getAnimationDurationSec(startSec, endSec);
    const animationEndSec = startSec + animationSec;
    const progress = `(t-${startSec})/${animationSec}`;
    expressions.push(`if(lt(t\\,${animationEndSec.toFixed(3)})\\,${progress}\\,1)`);
  }

  if (animationOut !== 'none') {
    const animationSec = getAnimationDurationSec(startSec, endSec);
    const animationStartSec = Math.max(startSec, endSec - animationSec);
    const progress = `(${endSec}-t)/${animationSec}`;
    expressions.push(`if(gt(t\\,${animationStartSec.toFixed(3)})\\,${progress}\\,1)`);
  }

  if (animationLoop === 'pulse' || animationLoop === 'glow') {
    expressions.push('(0.88+0.12*(sin(t*6.283)+1)/2)');
  }

  if (normalizedOpacity < 1) {
    expressions.push(normalizedOpacity.toString());
  }

  if (expressions.length === 0) return null;
  return expressions.length === 1
    ? (expressions[0] ?? null)
    : buildNestedMinExpression(expressions);
}

function buildTypewriterDrawtextFilters(
  overlay: DrawtextOverlayInput,
  fontFile: string | null,
): string[] {
  const characters = Array.from(overlay.content);
  if (characters.length === 0) return [];

  const startSec = overlay.startMs / 1000;
  const endSec = overlay.endMs / 1000;
  const durationSec = getTypewriterDurationSec(startSec, endSec, characters.length);
  const stepCount = Math.min(characters.length, TYPEWRITER_MAX_FILTER_STEPS);
  const filters: string[] = [];

  for (let stepIndex = 1; stepIndex <= stepCount; stepIndex++) {
    const visibleCharacters = Math.ceil((stepIndex / stepCount) * characters.length);
    const content = characters.slice(0, visibleCharacters).join('');
    const stepStartSec = startSec + ((stepIndex - 1) / stepCount) * durationSec;
    const stepEndSec =
      stepIndex === stepCount ? endSec : startSec + (stepIndex / stepCount) * durationSec;

    filters.push(
      buildStaticDrawtextFilter(
        overlay,
        fontFile,
        content,
        `between(t\\,${stepStartSec.toFixed(3)}\\,${stepEndSec.toFixed(3)})`,
      ),
    );
  }

  return filters;
}

function buildStaticDrawtextFilter(
  overlay: DrawtextOverlayInput,
  fontFile: string | null,
  content: string,
  enableExpression: string,
): string {
  const escapedText = escapeDrawtextText(content);
  const color = toFFmpegColor(overlay.color, 'white');
  const opacity = normalizeOpacity(overlay.opacity ?? 1);

  let filter = `drawtext=text='${escapedText}'`;
  filter += `:x=${buildTextAlignXExpression(overlay.x, overlay.textAlign ?? 'center')}`;
  filter += `:y=(h*${overlay.y}/100)-(text_h/2)`;
  filter += `:fontsize=${overlay.fontSize}`;
  filter += `:fontcolor=${color}`;
  if (opacity < 1) {
    filter += `:alpha='${opacity}'`;
  }

  if (fontFile) {
    filter += `:fontfile=${escapeDrawtextValue(fontFile)}`;
  }

  filter += `:enable='${enableExpression}'`;

  if (overlay.backgroundColor) {
    const bgColor = toFFmpegColor(
      overlay.backgroundColor,
      'black',
      overlay.backgroundOpacity ?? 0.7,
    );
    filter += `:box=1:boxcolor=${bgColor}:boxborderw=${TEXT_BOX_BORDER_WIDTH}`;
  }

  return filter;
}

function buildYExpression(
  yPercent: number,
  animationIn: ModernTextAnimationIn,
  animationOut: ModernTextAnimationOut,
  startSec: number,
  endSec: number,
): string {
  const baseY = `(h*${yPercent}/100)-(text_h/2)`;

  if (animationIn !== 'slide-up' && animationIn !== 'slide-down' && animationOut !== 'slide-out') {
    return baseY;
  }

  const animationSec = getAnimationDurationSec(startSec, endSec);
  const inEndSec = startSec + animationSec;

  if (animationIn === 'slide-up' || animationIn === 'slide-down') {
    const progress = `(t-${startSec})/${animationSec}`;
    const offset =
      animationIn === 'slide-up'
        ? `+${TEXT_SLIDE_DISTANCE_PX}*(1-${progress})`
        : `-${TEXT_SLIDE_DISTANCE_PX}*(1-${progress})`;

    if (animationOut !== 'slide-out') {
      return `if(lt(t\\,${inEndSec.toFixed(3)})\\,${baseY}${offset}\\,${baseY})`;
    }
  }

  if (animationOut === 'slide-out') {
    const outStartSec = Math.max(startSec, endSec - animationSec);
    const outProgress = `(t-${outStartSec.toFixed(3)})/${animationSec}`;
    const outY = `${baseY}+${TEXT_SLIDE_DISTANCE_PX}*${outProgress}`;

    if (animationIn === 'slide-up' || animationIn === 'slide-down') {
      const progress = `(t-${startSec})/${animationSec}`;
      const offset =
        animationIn === 'slide-up'
          ? `+${TEXT_SLIDE_DISTANCE_PX}*(1-${progress})`
          : `-${TEXT_SLIDE_DISTANCE_PX}*(1-${progress})`;
      return `if(lt(t\\,${inEndSec.toFixed(3)})\\,${baseY}${offset}\\,if(gt(t\\,${outStartSec.toFixed(3)})\\,${outY}\\,${baseY}))`;
    }

    return `if(gt(t\\,${outStartSec.toFixed(3)})\\,${outY}\\,${baseY})`;
  }

  return baseY;
}

function buildXExpression(
  xPercent: number,
  textAlign: 'left' | 'center' | 'right',
  animationLoop: ModernTextAnimationLoop,
): string {
  const baseX = buildTextAlignXExpression(xPercent, textAlign);

  if (animationLoop === 'shake') {
    return `${baseX}+${TEXT_SHAKE_DISTANCE_PX}*sin(t*34)`;
  }

  return baseX;
}

function buildTextAlignXExpression(
  xPercent: number,
  textAlign: 'left' | 'center' | 'right',
): string {
  if (textAlign === 'left') {
    return `(w*${xPercent}/100)`;
  }

  if (textAlign === 'right') {
    return `(w*${xPercent}/100)-text_w`;
  }

  return `(w*${xPercent}/100)-(text_w/2)`;
}

function normalizeOpacity(opacity: number): number {
  if (!Number.isFinite(opacity)) {
    return 1;
  }

  return Math.max(0, Math.min(1, opacity));
}

function buildFontSizeExpression(
  fontSize: number,
  animationIn: ModernTextAnimationIn,
  animationOut: ModernTextAnimationOut,
  startSec: number,
  endSec: number,
): string {
  const animationSec = getAnimationDurationSec(startSec, endSec);

  if (animationIn === 'pop' || animationIn === 'zoom') {
    const startScale = animationIn === 'pop' ? 0.78 : 0.88;
    const inEndSec = startSec + animationSec;
    const progress = `(t-${startSec})/${animationSec}`;
    return `'if(lt(t\\,${inEndSec.toFixed(3)})\\,${fontSize}*(${startScale}+(1-${startScale})*${progress})\\,${fontSize})'`;
  }

  if (animationOut === 'shrink') {
    const outStartSec = Math.max(startSec, endSec - animationSec);
    const progress = `(t-${outStartSec.toFixed(3)})/${animationSec}`;
    return `'if(gt(t\\,${outStartSec.toFixed(3)})\\,${fontSize}*(1-0.18*${progress})\\,${fontSize})'`;
  }

  return fontSize.toString();
}

function getAnimationDurationSec(startSec: number, endSec: number): number {
  const overlayDurationSec = Math.max(TEXT_ANIMATION_MIN_SEC, endSec - startSec);
  return Math.max(TEXT_ANIMATION_MIN_SEC, Math.min(TEXT_ANIMATION_MAX_SEC, overlayDurationSec / 2));
}

function buildNestedMinExpression(expressions: string[]): string {
  return expressions.reduce((accumulator, expression) => `min(${accumulator}\\,${expression})`);
}

function getTypewriterDurationSec(
  startSec: number,
  endSec: number,
  characterCount: number,
): number {
  const overlayDurationSec = Math.max(TEXT_ANIMATION_MIN_SEC, endSec - startSec);
  const naturalDurationSec = Math.max(1, characterCount) * TYPEWRITER_SEC_PER_CHARACTER;
  const boundedDurationSec = Math.min(
    TYPEWRITER_MAX_DURATION_SEC,
    Math.max(TYPEWRITER_MIN_DURATION_SEC, naturalDurationSec),
  );

  return Math.max(TEXT_ANIMATION_MIN_SEC, Math.min(overlayDurationSec, boundedDurationSec));
}
