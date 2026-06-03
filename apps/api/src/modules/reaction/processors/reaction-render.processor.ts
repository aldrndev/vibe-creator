import { runFFmpeg, validateInputPath, validateOutputPath } from '@/modules/export/ffmpeg';
import { getVideoDuration, getVideoResolution, hasVideoAudioStream } from '@/utils/video-info';
import type { ReactionRenderSpec } from '../reaction.schemas';

const PROCESS_TIMEOUT_MS = 3 * 60 * 60 * 1000;
const OUTPUT_DURATION_TOLERANCE_MS = 350;
const SPLIT_BOUNDARY_FEATHER_RATIO = 0.045;
const SPLIT_BOUNDARY_FEATHER_MIN_PX = 32;
const SPLIT_BOUNDARY_FEATHER_MAX_PX = 72;
const SPLIT_BOUNDARY_GAUSSIAN_SIGMA = 9;
const SPLIT_BOUNDARY_GAUSSIAN_STEPS = 2;
const SPLIT_BOUNDARY_BLUR_ALPHA = 0.34;

interface ReactionRenderInput {
  readonly spec: ReactionRenderSpec;
  readonly outputPath: string;
  readonly onProgress?: (percent: number) => void;
}

interface PaneSize {
  readonly width: number;
  readonly height: number;
}

interface PaneRenderInput {
  readonly inputLabel: string;
  readonly outputLabel: string;
  readonly pane: PaneSize;
  readonly framing: ReactionRenderSpec['mainFraming'];
  readonly appendFilter?: string;
}

interface SplitPaneRole {
  readonly role: 'main' | 'reaction';
  readonly pane: PaneSize;
  readonly inputLabel: string;
  readonly outputLabel: string;
  readonly framing: ReactionRenderSpec['mainFraming'];
  readonly appendFilter?: string;
}

interface AudioFilterResult {
  readonly filters: readonly string[];
  readonly hasAudioOutput: boolean;
}

/**
 * Render one reaction composition through the export worker.
 */
export async function renderReactionVideo(input: ReactionRenderInput): Promise<string> {
  const mainPath = validateInputPath(input.spec.mainAssetPath);
  const reactionPath = validateInputPath(input.spec.reactionAssetPath);
  const outputPath = validateOutputPath(input.outputPath);
  const filterGraph = buildReactionFilterGraph(input.spec);
  const includeAudio = shouldIncludeAudio(input.spec);
  const args = [
    '-nostdin',
    '-hide_banner',
    '-progress',
    'pipe:1',
    '-i',
    mainPath,
    '-i',
    reactionPath,
    '-filter_complex',
    filterGraph,
    '-map',
    '[vout]',
  ];

  if (includeAudio) {
    args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '192k');
  } else {
    args.push('-an');
  }

  args.push(
    '-t',
    toSeconds(input.spec.outputDurationMs),
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-y',
    outputPath,
  );

  await runFFmpeg({
    args,
    tempDir: '',
    totalDurationMs: input.spec.outputDurationMs,
    timeoutMs: PROCESS_TIMEOUT_MS,
    onProgress: (progress) => input.onProgress?.(progress.percent ?? 0),
  });

  await verifyReactionOutput(input.spec, outputPath);
  return outputPath;
}

export function buildReactionFilterGraph(spec: ReactionRenderSpec): string {
  const videoFilters = [
    buildMainVideoFilter(spec),
    buildReactionVideoFilter(spec),
    buildLayoutFilter(spec),
  ];
  const audio = buildAudioFilters(spec);

  return [...videoFilters, ...audio.filters]
    .filter((filter) => filter.length > 0)
    .map(removeTrailingFilterSeparator)
    .join(';');
}

function buildMainVideoFilter(spec: ReactionRenderSpec): string {
  return `[0:v]trim=duration=${toSeconds(spec.outputDurationMs)},setpts=PTS-STARTPTS[main0];`;
}

function buildReactionVideoFilter(spec: ReactionRenderSpec): string {
  const offsetSeconds = spec.reactionOffsetMs / 1000;
  if (spec.reactionOffsetMs >= 0) {
    const durationMs = Math.max(1, spec.outputDurationMs - spec.reactionOffsetMs);
    return (
      `[1:v]trim=duration=${toSeconds(durationMs)},` +
      `setpts=PTS-STARTPTS+${offsetSeconds.toFixed(3)}/TB[reaction0];`
    );
  }

  return (
    `[1:v]trim=start=${toSeconds(Math.abs(spec.reactionOffsetMs))}:` +
    `duration=${toSeconds(spec.outputDurationMs)},setpts=PTS-STARTPTS[reaction0];`
  );
}

function buildLayoutFilter(spec: ReactionRenderSpec): string {
  if (spec.layoutMode === 'side-by-side') {
    return buildSplitLayoutFilter(spec);
  }

  if (spec.layoutMode === 'vertical-short') {
    return buildVerticalShortFilter(spec);
  }

  return buildPipLayoutFilter(spec);
}

function buildPipLayoutFilter(spec: ReactionRenderSpec): string {
  const { outputWidth: width, outputHeight: height } = spec;
  const pipWidth = makeEven(width * spec.pipScale);
  const pipHeight = spec.circular ? pipWidth : makeEven(pipWidth * 0.5625);
  const pipMargin = Math.round(Math.max(18, Math.min(width, height) * 0.035));
  const position = resolvePipPosition(spec, pipWidth, pipMargin);
  const reactionLabel = spec.circular ? 'reactionmask' : 'reactionpip';
  const circularFilter = spec.circular
    ? `[reactionpip]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte((X-W/2)*(X-W/2)+(Y-H/2)*(Y-H/2),(min(W,H)/2)*(min(W,H)/2)),255,0)'[reactionmask];`
    : '';

  return (
    '[main0]split[mainbg][mainfg];' +
    `[mainbg]scale=${width}:${height}:force_original_aspect_ratio=increase,` +
    `crop=${width}:${height},boxblur=20:10[bg];` +
    buildFramedVideoPaneFilter({
      inputLabel: 'mainfg',
      outputLabel: 'mainfit',
      pane: { width, height },
      framing: spec.mainFraming,
    }) +
    '[bg][mainfit]overlay=0:0[base];' +
    buildFramedVideoPaneFilter({
      inputLabel: 'reaction0',
      outputLabel: 'reactionpip',
      pane: { width: pipWidth, height: pipHeight },
      framing: spec.reactionFraming,
      appendFilter: buildReactionVideoPadFilter(spec),
    }) +
    circularFilter +
    `[base][${reactionLabel}]overlay=${position.x}:${position.y}:eof_action=pass,format=yuv420p[vout];`
  );
}

function buildSplitLayoutFilter(spec: ReactionRenderSpec): string {
  const main = resolveSplitMainPane(spec);
  const reaction = resolveSplitReactionPane(spec, main);
  const stackFilter = spec.splitOrientation === 'horizontal' ? 'hstack' : 'vstack';
  const needsOverlayComposition = spec.smoothBorder || spec.blurOverlay;
  const ordered = resolveOrderedSplitPanes(spec, main, reaction);

  if (needsOverlayComposition) {
    return buildSplitOverlayLayoutFilter(spec, ordered);
  }

  return (
    buildSplitPaneFilter(ordered.first) +
    buildSplitPaneFilter(ordered.second) +
    `[${ordered.first.outputLabel}][${ordered.second.outputLabel}]${stackFilter}=inputs=2,format=yuv420p[vout];`
  );
}

function buildVerticalShortFilter(spec: ReactionRenderSpec): string {
  const mainHeight = makeEven(spec.outputHeight * spec.splitRatio);
  const reactionHeight = spec.outputHeight - mainHeight;
  const verticalSpec: ReactionRenderSpec = {
    ...spec,
    splitOrientation: 'vertical',
  };
  const main = { width: spec.outputWidth, height: mainHeight };
  const reaction = { width: spec.outputWidth, height: reactionHeight };
  const ordered = resolveOrderedSplitPanes(verticalSpec, main, reaction);

  if (spec.smoothBorder || spec.blurOverlay) {
    return buildSplitOverlayLayoutFilter(verticalSpec, ordered);
  }

  return (
    buildSplitPaneFilter(ordered.first) +
    buildSplitPaneFilter(ordered.second) +
    `[${ordered.first.outputLabel}][${ordered.second.outputLabel}]vstack=inputs=2,format=yuv420p[vout];`
  );
}

function buildSplitOverlayLayoutFilter(
  spec: ReactionRenderSpec,
  ordered: {
    readonly first: SplitPaneRole;
    readonly second: SplitPaneRole;
  },
): string {
  if (spec.smoothBorder) {
    return buildSplitFeatheredLayoutFilter(spec, ordered);
  }

  const stackFilter = spec.splitOrientation === 'horizontal' ? 'hstack' : 'vstack';

  return (
    buildSplitPaneFilter(ordered.first) +
    buildSplitPaneFilter(ordered.second) +
    `[${ordered.first.outputLabel}][${ordered.second.outputLabel}]${stackFilter}=inputs=2[stacked];` +
    buildSplitBoundaryBlurOverlayFilter(spec, 'stacked')
  );
}

function buildSplitFeatheredLayoutFilter(
  spec: ReactionRenderSpec,
  ordered: {
    readonly first: SplitPaneRole;
    readonly second: SplitPaneRole;
  },
): string {
  const feather = resolveSplitBoundaryFeather(spec);
  const horizontalBoundary = spec.splitOrientation === 'horizontal';
  const firstPane = {
    width: horizontalBoundary ? ordered.first.pane.width + feather : ordered.first.pane.width,
    height: horizontalBoundary ? ordered.first.pane.height : ordered.first.pane.height + feather,
  };
  const secondPane = {
    width: horizontalBoundary ? ordered.second.pane.width + feather : ordered.second.pane.width,
    height: horizontalBoundary ? ordered.second.pane.height : ordered.second.pane.height + feather,
  };
  const secondX = horizontalBoundary ? ordered.first.pane.width - feather : 0;
  const secondY = horizontalBoundary ? 0 : ordered.first.pane.height - feather;
  const firstAlphaExpression = horizontalBoundary
    ? `if(gte(X,W-${feather}),255*(1-(X-(W-${feather}))/${feather}),255)`
    : `if(gte(Y,H-${feather}),255*(1-(Y-(H-${feather}))/${feather}),255)`;
  const secondAlphaExpression = horizontalBoundary
    ? `if(lte(X,${feather}),255*(X/${feather}),255)`
    : `if(lte(Y,${feather}),255*(Y/${feather}),255)`;

  return (
    buildFramedVideoPaneFilter({
      ...ordered.first,
      pane: firstPane,
      outputLabel: 'firstpane',
    }) +
    `[firstpane]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${firstAlphaExpression}'[firstalpha];` +
    buildFramedVideoPaneFilter({
      ...ordered.second,
      pane: secondPane,
      outputLabel: 'secondpane',
    }) +
    `[secondpane]format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='${secondAlphaExpression}'[secondalpha];` +
    `[firstalpha]pad=${spec.outputWidth}:${spec.outputHeight}:0:0:color=black@0[base];` +
    `[base][secondalpha]overlay=${secondX}:${secondY}:eof_action=pass[blended];` +
    (spec.blurOverlay
      ? buildSplitBoundaryBlurOverlayFilter(spec, 'blended')
      : '[blended]format=yuv420p[vout];')
  );
}

function buildSplitBoundaryBlurOverlayFilter(
  spec: ReactionRenderSpec,
  sourceLabel: string,
): string {
  const feather = resolveSplitBoundaryFeather(spec);
  const horizontalBoundary = spec.splitOrientation === 'horizontal';
  const boundaryOffset = resolveSplitBoundaryOffset(spec);
  const boundaryWidth = horizontalBoundary ? feather : spec.outputWidth;
  const boundaryHeight = horizontalBoundary ? spec.outputHeight : feather;
  const boundaryX = horizontalBoundary
    ? clampEven(Math.round(boundaryOffset - feather / 2), 0, spec.outputWidth - feather)
    : 0;
  const boundaryY = horizontalBoundary
    ? 0
    : clampEven(Math.round(boundaryOffset - feather / 2), 0, spec.outputHeight - feather);
  const cropFilter = `crop=${boundaryWidth}:${boundaryHeight}:${boundaryX}:${boundaryY}`;
  const alphaFalloffExpression = horizontalBoundary
    ? '(1-abs(X-W/2)/(W/2))'
    : '(1-abs(Y-H/2)/(H/2))';

  return (
    `[${sourceLabel}]split[stackbase][stackblur];` +
    `[stackblur]${cropFilter},gblur=sigma=${SPLIT_BOUNDARY_GAUSSIAN_SIGMA}:steps=${SPLIT_BOUNDARY_GAUSSIAN_STEPS},format=rgba,` +
    `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='255*${SPLIT_BOUNDARY_BLUR_ALPHA}*${alphaFalloffExpression}'[boundary];` +
    `[stackbase][boundary]overlay=${boundaryX}:${boundaryY}:eof_action=pass,format=yuv420p[vout];`
  );
}

function buildSplitPaneFilter(pane: SplitPaneRole): string {
  return buildFramedVideoPaneFilter(pane);
}

function buildFramedVideoPaneFilter(input: PaneRenderInput): string {
  const zoom = input.framing.fit === 'cover' ? input.framing.zoom : 1;
  const scaledWidth = makeEven(input.pane.width * zoom);
  const scaledHeight = makeEven(input.pane.height * zoom);
  const positionX = formatFraction(input.framing.x / 100);
  const positionY = formatFraction(input.framing.y / 100);
  const baseFilter =
    input.framing.fit === 'contain'
      ? `[${input.inputLabel}]scale=${input.pane.width}:${input.pane.height}:force_original_aspect_ratio=decrease,` +
        `pad=${input.pane.width}:${input.pane.height}:(ow-iw)*${positionX}:(oh-ih)*${positionY}:color=black`
      : `[${input.inputLabel}]scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase,` +
        `crop=${input.pane.width}:${input.pane.height}:(iw-ow)*${positionX}:(ih-oh)*${positionY}`;

  return `${baseFilter}${input.appendFilter ? `,${input.appendFilter}` : ''}[${input.outputLabel}];`;
}

function resolveOrderedSplitPanes(
  spec: ReactionRenderSpec,
  main: PaneSize,
  reaction: PaneSize,
): {
  readonly first: SplitPaneRole;
  readonly second: SplitPaneRole;
} {
  const mainPane: SplitPaneRole = {
    role: 'main',
    pane: main,
    inputLabel: 'main0',
    outputLabel: 'mainpane',
    framing: spec.mainFraming,
  };
  const reactionPane: SplitPaneRole = {
    role: 'reaction',
    pane: reaction,
    inputLabel: 'reaction0',
    outputLabel: 'reactionpane',
    framing: spec.reactionFraming,
    appendFilter: buildReactionVideoPadFilter(spec),
  };

  return spec.mainPlacement === 'end'
    ? { first: reactionPane, second: mainPane }
    : { first: mainPane, second: reactionPane };
}

function resolveSplitBoundaryOffset(spec: ReactionRenderSpec): number {
  const axisSize = spec.splitOrientation === 'horizontal' ? spec.outputWidth : spec.outputHeight;
  const mainSize = axisSize * spec.splitRatio;
  return spec.mainPlacement === 'end' ? axisSize - mainSize : mainSize;
}

function resolveSplitBoundaryFeather(spec: ReactionRenderSpec): number {
  return makeEven(
    Math.min(
      SPLIT_BOUNDARY_FEATHER_MAX_PX,
      Math.max(
        SPLIT_BOUNDARY_FEATHER_MIN_PX,
        Math.round(Math.min(spec.outputWidth, spec.outputHeight) * SPLIT_BOUNDARY_FEATHER_RATIO),
      ),
    ),
  );
}

function buildReactionVideoPadFilter(spec: ReactionRenderSpec): string {
  return `tpad=stop_mode=clone:stop_duration=${toSeconds(spec.outputDurationMs)}`;
}

function buildAudioFilters(spec: ReactionRenderSpec): AudioFilterResult {
  const filters: string[] = [];
  const activeMain = spec.mainHasAudio && !spec.muteMain && spec.mainVolume > 0;
  const activeReaction = spec.reactionHasAudio && !spec.muteReaction && spec.reactionVolume > 0;

  if (activeMain) {
    filters.push(
      `[0:a]atrim=duration=${toSeconds(spec.outputDurationMs)},` +
        `asetpts=PTS-STARTPTS,volume=${formatVolume(spec.mainVolume)}[amain]`,
    );
  }

  if (activeReaction) {
    filters.push(buildReactionAudioFilter(spec));
  }

  if (activeMain && activeReaction) {
    filters.push(
      '[amain][areaction]amix=inputs=2:duration=first:dropout_transition=0,' +
        `atrim=duration=${toSeconds(spec.outputDurationMs)}[aout]`,
    );
    return { filters, hasAudioOutput: true };
  }

  if (activeMain) {
    filters.push(`[amain]atrim=duration=${toSeconds(spec.outputDurationMs)}[aout]`);
    return { filters, hasAudioOutput: true };
  }

  if (activeReaction) {
    filters.push(`[areaction]atrim=duration=${toSeconds(spec.outputDurationMs)}[aout]`);
    return { filters, hasAudioOutput: true };
  }

  return { filters, hasAudioOutput: false };
}

function buildReactionAudioFilter(spec: ReactionRenderSpec): string {
  if (spec.reactionOffsetMs >= 0) {
    const durationMs = Math.max(1, spec.outputDurationMs - spec.reactionOffsetMs);
    return (
      `[1:a]atrim=duration=${toSeconds(durationMs)},asetpts=PTS-STARTPTS,` +
      `adelay=${spec.reactionOffsetMs}|${spec.reactionOffsetMs},` +
      `volume=${formatVolume(spec.reactionVolume)}[areaction]`
    );
  }

  return (
    `[1:a]atrim=start=${toSeconds(Math.abs(spec.reactionOffsetMs))}:` +
    `duration=${toSeconds(spec.outputDurationMs)},asetpts=PTS-STARTPTS,` +
    `volume=${formatVolume(spec.reactionVolume)}[areaction]`
  );
}

function shouldIncludeAudio(spec: ReactionRenderSpec): boolean {
  return (
    (spec.mainHasAudio && !spec.muteMain && spec.mainVolume > 0) ||
    (spec.reactionHasAudio && !spec.muteReaction && spec.reactionVolume > 0)
  );
}

function resolveSplitMainPane(spec: ReactionRenderSpec): PaneSize {
  if (spec.splitOrientation === 'horizontal') {
    return {
      width: makeEven(spec.outputWidth * spec.splitRatio),
      height: spec.outputHeight,
    };
  }

  return {
    width: spec.outputWidth,
    height: makeEven(spec.outputHeight * spec.splitRatio),
  };
}

function resolveSplitReactionPane(spec: ReactionRenderSpec, main: PaneSize): PaneSize {
  if (spec.splitOrientation === 'horizontal') {
    return {
      width: spec.outputWidth - main.width,
      height: spec.outputHeight,
    };
  }

  return {
    width: spec.outputWidth,
    height: spec.outputHeight - main.height,
  };
}

function resolvePipPosition(
  spec: ReactionRenderSpec,
  pipWidth: number,
  margin: number,
): { readonly x: number; readonly y: number } {
  const defaultHeight = spec.circular ? pipWidth : Math.round(pipWidth * 0.5625);
  const maxX = Math.max(margin, spec.outputWidth - pipWidth - margin);
  const maxY = Math.max(margin, spec.outputHeight - defaultHeight - margin);

  switch (spec.pipPosition) {
    case 'top-left':
      return { x: margin, y: margin };
    case 'top-right':
      return { x: maxX, y: margin };
    case 'bottom-left':
      return { x: margin, y: maxY };
    case 'bottom-right':
    case 'custom':
      return { x: maxX, y: maxY };
  }
}

function removeTrailingFilterSeparator(filter: string): string {
  return filter.endsWith(';') ? filter.slice(0, -1) : filter;
}

function toSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(3);
}

function formatVolume(value: number): string {
  return Math.max(0, Math.min(2, value)).toFixed(3);
}

function formatFraction(value: number): string {
  return Math.max(0, Math.min(1, value)).toFixed(3);
}

function makeEven(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

function clampEven(value: number, min: number, max: number): number {
  return makeEven(Math.min(max, Math.max(min, value)));
}

async function verifyReactionOutput(spec: ReactionRenderSpec, outputPath: string): Promise<void> {
  const [durationMs, dimensions, hasAudio] = await Promise.all([
    getVideoDuration(outputPath),
    getVideoResolution(outputPath),
    hasVideoAudioStream(outputPath),
  ]);
  if (Math.abs(durationMs - spec.outputDurationMs) > OUTPUT_DURATION_TOLERANCE_MS) {
    throw new Error('Durasi hasil reaction tidak sesuai video utama.');
  }
  if (dimensions.width !== spec.outputWidth || dimensions.height !== spec.outputHeight) {
    throw new Error('Resolusi hasil reaction tidak sesuai format output.');
  }
  if (hasAudio !== shouldIncludeAudio(spec)) {
    throw new Error('Audio hasil reaction tidak sesuai pengaturan.');
  }
}
