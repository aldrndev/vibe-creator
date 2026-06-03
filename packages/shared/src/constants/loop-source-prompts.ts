import type {
  LoopLightingOption,
  LoopMood,
  LoopSceneId,
  LoopSourcePromptInput,
  LoopVisualStyle,
} from '../types/prompt';

export interface LoopSceneDefinition {
  readonly id: Exclude<LoopSceneId, 'custom'>;
  readonly label: string;
  readonly description: string;
  readonly thumbnailUrl: string;
  readonly visualComposition: string;
  readonly continuousMotion: string;
  readonly nativeAudio: string;
  readonly excludedEvents: readonly string[];
  readonly supportedLighting: readonly LoopLightingOption[];
  readonly defaultMood: LoopMood;
  readonly defaultLighting: LoopLightingOption;
}

export const LOOP_MOOD_OPTIONS: ReadonlyArray<{ value: LoopMood; label: string; prompt: string }> =
  [
    { value: 'natural-calm', label: 'Natural Calm', prompt: 'a calm, natural, unforced ambience' },
    { value: 'cozy-warm', label: 'Cozy Warm', prompt: 'a comforting and intimate warm ambience' },
    {
      value: 'cinematic-peaceful',
      label: 'Cinematic Peaceful',
      prompt: 'a serene cinematic ambience with restrained realism',
    },
    { value: 'meditative', label: 'Meditative', prompt: 'a quiet meditative atmosphere' },
    {
      value: 'sleep-ambience',
      label: 'Sleep Ambience',
      prompt: 'a very gentle sleep-friendly ambience',
    },
  ] as const;

export const LOOP_LIGHTING_OPTIONS: ReadonlyArray<{
  value: LoopLightingOption;
  label: string;
  prompt: string;
}> = [
  {
    value: 'morning-soft-light',
    label: 'Morning Soft Light',
    prompt: 'soft stable morning light with natural low contrast',
  },
  {
    value: 'golden-hour',
    label: 'Golden Hour',
    prompt: 'steady golden-hour warmth with gentle highlights',
  },
  {
    value: 'evening-warm-light',
    label: 'Evening Warm Light',
    prompt: 'warm settled evening illumination',
  },
  {
    value: 'night-ambient-light',
    label: 'Night Ambient Light',
    prompt: 'stable low-light nighttime ambience with controlled highlights',
  },
  {
    value: 'overcast-calm',
    label: 'Overcast Calm',
    prompt: 'soft overcast daylight with even exposure',
  },
] as const;

export const LOOP_VISUAL_STYLE_OPTIONS: ReadonlyArray<{
  value: LoopVisualStyle;
  label: string;
  prompt: string;
}> = [
  { value: 'photorealistic', label: 'Photorealistic', prompt: 'photorealistic' },
  { value: 'cinematic-natural', label: 'Cinematic Natural', prompt: 'cinematic naturalistic' },
  { value: 'ultra-realistic', label: 'Ultra Realistic', prompt: 'ultra-realistic' },
  { value: 'soft-cozy', label: 'Soft Cozy', prompt: 'soft cozy photorealistic' },
  {
    value: 'ambient-documentary',
    label: 'Ambient Documentary',
    prompt: 'observational documentary-style photorealistic',
  },
] as const;

export const LOOP_SCENE_DEFINITIONS: readonly LoopSceneDefinition[] = [
  {
    id: 'cozy-fireplace',
    label: 'Cozy Fireplace',
    description: 'Ruang hangat dengan perapian tenang.',
    thumbnailUrl: '/images/loop-scenes/cozy-fireplace.jpg',
    visualComposition:
      'a warm quiet living room with a stone fireplace centered in the middle background, gently burning logs in the hearth, a soft fabric sofa edge in the foreground, warm wooden flooring, and understated cozy decor kept still',
    continuousMotion:
      'only a natural gentle flicker of small flames and slow glowing movement of embers, steady and repetitive without large bursts',
    nativeAudio: 'gentle fireplace crackling and quiet ember pops at a stable relaxing level',
    excludedEvents: ['people', 'pets', 'major flame bursts', 'collapsing logs', 'sudden sparks'],
    supportedLighting: ['night-ambient-light', 'evening-warm-light'],
    defaultMood: 'cozy-warm',
    defaultLighting: 'night-ambient-light',
  },
  {
    id: 'forest-river',
    label: 'Forest River',
    description: 'Aliran sungai kecil di hutan hijau.',
    thumbnailUrl: '/images/loop-scenes/forest-river.jpg',
    visualComposition:
      'a shallow clear river flowing through a lush green forest, smooth mossy stones in the foreground, layered trees and ferns in the background, with the water channel as the calm focal point',
    continuousMotion:
      'continuous smooth water flowing around the stones and only very slight repeated leaf movement in a light breeze',
    nativeAudio: 'soft flowing river water with a restrained, distant forest ambience',
    excludedEvents: ['people', 'animals crossing frame', 'falling branches', 'sudden wind gusts'],
    supportedLighting: ['morning-soft-light', 'overcast-calm', 'golden-hour'],
    defaultMood: 'natural-calm',
    defaultLighting: 'morning-soft-light',
  },
  {
    id: 'rainy-window',
    label: 'Rainy Window',
    description: 'Hujan lembut dari interior nyaman.',
    thumbnailUrl: '/images/loop-scenes/rainy-window.jpg',
    visualComposition:
      'a quiet comfortable interior looking toward a large rain-covered window, a warm lamp and a mug resting still on a wooden sill, with an indistinct peaceful city or garden beyond the wet glass',
    continuousMotion:
      'many gentle rain droplets sliding steadily down the glass in overlapping continuous paths',
    nativeAudio:
      'consistent soft rainfall on glass with an extremely distant low thunder texture, never a distinct strike',
    excludedEvents: ['people', 'lightning flashes', 'passing vehicles', 'loud thunder cracks'],
    supportedLighting: ['overcast-calm', 'evening-warm-light', 'night-ambient-light'],
    defaultMood: 'sleep-ambience',
    defaultLighting: 'evening-warm-light',
  },
  {
    id: 'ocean-shore',
    label: 'Ocean Shore',
    description: 'Ombak kecil di garis pantai tenang.',
    thumbnailUrl: '/images/loop-scenes/ocean-shore.jpg',
    visualComposition:
      'a tranquil open shoreline viewed from dry sand, shallow waves approaching a clean beach in the foreground and a calm horizon held level in the background',
    continuousMotion:
      'small regular waves gently advancing and receding with soft repeating foam patterns',
    nativeAudio: 'natural gentle ocean surf with steady soft wave wash and light sea breeze',
    excludedEvents: [
      'people',
      'boats entering frame',
      'large crashing waves',
      'birds crossing close',
    ],
    supportedLighting: ['morning-soft-light', 'golden-hour', 'evening-warm-light'],
    defaultMood: 'natural-calm',
    defaultLighting: 'golden-hour',
  },
  {
    id: 'night-campfire',
    label: 'Night Campfire',
    description: 'Api unggun damai di hutan malam.',
    thumbnailUrl: '/images/loop-scenes/night-campfire.jpg',
    visualComposition:
      'a small controlled campfire on a forest clearing at night, logs and stones centered in the foreground with dark still tree trunks framing the quiet background',
    continuousMotion:
      'gentle contained flames and glowing embers moving softly at a stable intensity',
    nativeAudio: 'quiet natural campfire crackle with subtle nighttime forest room tone',
    excludedEvents: ['people', 'large sparks', 'wood collapsing', 'wildlife calls near the camera'],
    supportedLighting: ['night-ambient-light'],
    defaultMood: 'meditative',
    defaultLighting: 'night-ambient-light',
  },
  {
    id: 'waterfall-retreat',
    label: 'Waterfall Retreat',
    description: 'Air terjun kecil yang menenangkan.',
    thumbnailUrl: '/images/loop-scenes/waterfall-retreat.jpg',
    visualComposition:
      'a small secluded waterfall pouring over dark stone into a tranquil pool, green plants framing both sides while the falling water remains the central focal point',
    continuousMotion:
      'a constant smooth curtain of falling water and soft repeating ripples in the pool',
    nativeAudio: 'continuous gentle waterfall wash with soft pool splashes',
    excludedEvents: ['people', 'animals', 'falling debris', 'sudden water surges'],
    supportedLighting: ['morning-soft-light', 'overcast-calm'],
    defaultMood: 'meditative',
    defaultLighting: 'overcast-calm',
  },
  {
    id: 'mountain-stream',
    label: 'Mountain Stream',
    description: 'Sungai pegunungan jernih dan sejuk.',
    thumbnailUrl: '/images/loop-scenes/mountain-stream.jpg',
    visualComposition:
      'a clear mountain stream threading between rounded stones and low evergreen growth, distant slopes softly visible while the rippling water is the main focus',
    continuousMotion:
      'gentle consistent ripples and narrow currents passing around the same stones',
    nativeAudio:
      'light stream water with very distant gentle birds blended quietly into the ambience',
    excludedEvents: ['people', 'nearby birds entering frame', 'splash events', 'changing weather'],
    supportedLighting: ['morning-soft-light', 'overcast-calm'],
    defaultMood: 'natural-calm',
    defaultLighting: 'morning-soft-light',
  },
  {
    id: 'cozy-cafe-rain',
    label: 'Cozy Cafe Rain',
    description: 'Suasana kafe sunyi saat hujan.',
    thumbnailUrl: '/images/loop-scenes/cozy-cafe-rain.jpg',
    visualComposition:
      'a quiet cafe corner beside a rain-streaked window, an untouched warm drink on a wooden table in the foreground, soft practical lamps and empty seating held still in the background',
    continuousMotion:
      'continuous delicate rainfall trails on the window and nearly imperceptible steam drift',
    nativeAudio: 'gentle rain against glass with a very soft stable indoor room tone',
    excludedEvents: [
      'customers',
      'staff',
      'clattering dishes',
      'door movement',
      'traffic passing close',
    ],
    supportedLighting: ['overcast-calm', 'evening-warm-light', 'night-ambient-light'],
    defaultMood: 'cozy-warm',
    defaultLighting: 'evening-warm-light',
  },
  {
    id: 'aquarium-calm',
    label: 'Aquarium Calm',
    description: 'Aquarium hening dengan gelembung lembut.',
    thumbnailUrl: '/images/loop-scenes/aquarium-calm.jpg',
    visualComposition:
      'a calm planted aquarium with soft green aquatic leaves, a few small slow-moving fish kept away from frame edges, smooth stones below, and a gentle bubble column as the visual anchor',
    continuousMotion:
      'slow repeated swimming paths, subtle plant sway, and an uninterrupted fine stream of bubbles',
    nativeAudio: 'very soft aquarium water circulation and delicate bubbling ambience',
    excludedEvents: [
      'fast fish movement',
      'feeding',
      'large fish entering frame',
      'lighting changes',
    ],
    supportedLighting: ['morning-soft-light', 'night-ambient-light'],
    defaultMood: 'meditative',
    defaultLighting: 'night-ambient-light',
  },
] as const;

export function createDefaultLoopSourcePromptInput(): LoopSourcePromptInput {
  return {
    type: 'LOOP_SOURCE',
    sceneId: 'cozy-fireplace',
    mood: 'natural-calm',
    lighting: 'night-ambient-light',
    aspectRatio: '16:9',
    durationSeconds: 8,
    visualStyle: 'photorealistic',
  };
}

export function findLoopScene(sceneId: LoopSceneId): LoopSceneDefinition | undefined {
  return LOOP_SCENE_DEFINITIONS.find((scene) => scene.id === sceneId);
}

export function createLoopSourcePromptTitle(input: LoopSourcePromptInput): string {
  const scene = findLoopScene(input.sceneId);
  return `${scene?.label ?? 'Custom Scene'} Loop Source`;
}

export function generateLoopSourcePrompt(input: LoopSourcePromptInput): string {
  const scene = resolvePromptScene(input);
  const mood = resolveOptionLabel(LOOP_MOOD_OPTIONS, input.mood);
  const lighting = resolveOptionLabel(LOOP_LIGHTING_OPTIONS, input.lighting);
  const style = resolveOptionLabel(LOOP_VISUAL_STYLE_OPTIONS, input.visualStyle);
  const aspect = resolveAspectLabel(input.aspectRatio);
  const details = input.additionalDetail?.trim()
    ? ` Incorporate this restrained scene detail without changing the locked composition or continuity requirements: ${input.additionalDetail.trim()}.`
    : '';
  const excluded = scene.excludedEvents.length > 0 ? `${scene.excludedEvents.join(', ')}, ` : '';

  return `Create a single uninterrupted ${input.durationSeconds}-second ${style} ambient video designed as a source clip for a long seamless loop.

Scene: ${scene.visualComposition}. Compose the shot in ${aspect} with a calm, stable focal point.${details}

Motion: ${scene.continuousMotion}. Every visible movement must remain gentle, repetitive, and consistent throughout the shot.

Atmosphere and lighting: ${mood}, using ${lighting}. Keep the lighting, color balance, exposure, weather conditions, and environmental details stable from beginning to end.

Camera: locked-off tripod shot from one fixed viewpoint. No cuts, no camera movement, no zoom, no pan, no tilt, no dolly, no handheld shake, and no focus changes.

Native audio: generate synchronized natural ambient audio matching the visible scene: ${scene.nativeAudio}. Keep the sound bed continuous and balanced, with no speech, no narration, no music, no sudden loud transient events, and no artificial sound effects unrelated to the environment.

Seamless-loop requirement: the final frames and final sound texture must closely match the opening frames and opening sound texture. Avoid any one-time event or visual/audio progression that reveals the clip ending or restarting.

Do not include ${excluded}text, captions, logos, watermarks, abrupt object changes, scene transitions, sudden lighting shifts, dramatic weather changes, or unexpected motion.

Output: ${aspect}, ${input.durationSeconds} seconds, high-quality realistic detail, one continuous take, optimized for seamless long-loop extension.`;
}

function resolvePromptScene(input: LoopSourcePromptInput): {
  visualComposition: string;
  continuousMotion: string;
  nativeAudio: string;
  excludedEvents: readonly string[];
} {
  const preset = findLoopScene(input.sceneId);
  if (preset) return preset;
  const custom = input.customScene;
  if (!custom) {
    throw new Error('Custom scene details are required.');
  }
  return {
    visualComposition: `${custom.environment}, with ${custom.focalPoint} as the calm central focal point`,
    continuousMotion: custom.continuousMotion,
    nativeAudio: custom.nativeAudio,
    excludedEvents: ['unrelated moving subjects', 'one-time events'],
  };
}

function resolveOptionLabel<T extends string>(
  options: ReadonlyArray<{ value: T; prompt: string }>,
  value: T,
): string {
  return options.find((option) => option.value === value)?.prompt ?? value;
}

function resolveAspectLabel(aspectRatio: LoopSourcePromptInput['aspectRatio']): string {
  return (
    {
      '16:9': 'landscape 16:9',
      '9:16': 'portrait 9:16',
      '1:1': 'square 1:1',
      '4:5': 'portrait 4:5',
    } as const
  )[aspectRatio];
}
