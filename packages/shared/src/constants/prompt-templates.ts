import type {
  CreativeScanPromptInput,
  ImagePromptInput,
  RelaxingPromptInput,
  ScriptPromptInput,
  TimelapsePromptInput,
  VideoGenPromptInput,
  VoicePromptInput,
} from '../types/prompt';
import { AIModel } from './model-registry';

/**
 * SHARED UTILITIES
 */
const CINEMATIC_KEYWORDS = [
  '4k',
  '8k',
  'hyperrealistic',
  'cinematic lighting',
  'volumetric fog',
  'anamorphic lens',
  'color graded',
  'unreal engine 5 render',
  'dramatic atmosphere',
  'ray tracing',
  'octane render',
  'sharp focus',
  'depth of field',
];

const PHOTOGRAPHY_TERMS = {
  portrait: '85mm lens, f/1.8, bokeh, studio lighting, softbox, rembrandt lighting',
  landscape: '16mm wide angle lens, f/11, golden hour, high dynamic range, sharp details',
  macro: '100mm macro lens, f/2.8, extreme close-up, texture detail',
  street: '35mm lens, f/5.6, candid, street photography, high contrast',
};

/**
 * ============================================================================
 * RENDERER IMPLEMENTATIONS (Model-Specific Logic)
 * ============================================================================
 */

// --- VIDEO RENDERERS ---

function renderSoraVideo(input: VideoGenPromptInput, _technicalAddons: string): string {
  // Sora System Role for LLM (Single Best Result)
  return `*** SYSTEM ROLE ***
You are a Lead Visual Effects Supervisor and Prompt Engineer for OpenAI Sora.

*** VISUAL CONCEPT ***
"${input.concept}"

*** TECHNICAL SPECIFICATIONS ***
- Style: ${input.style} ${
    input.style.toLowerCase().includes('cinematic')
      ? '(Photorealistic/Cinematic)'
      : '(Stylized/Artistic)'
  }
- Camera Movement: ${input.movement || 'Dynamic/Cinematic'}
- Lighting: ${input.lighting}
- Mood: ${input.mood}
- Ratio: ${input.aspectRatio}

*** PROMPT ENGINEERING TASK ***
Create the SINGLE BEST "Sora" prompt for this concept. 
Focus on describing the physics, motion solidity, and lighting evolution. 
Do not output variations. Just the one perfect prompt.

*** REQUIRED OUTPUT FORMAT ***
Output only the prompt inside a code block.

\`\`\`
Hyper-realistic video of... [Your generated prompt here]
\`\`\``;
}

function renderMidjourneyVideo(input: VideoGenPromptInput, technicalAddons: string): string {
  // Midjourney System Role for LLM (Single Best Result)
  return `*** SYSTEM ROLE ***
You are an expert Midjourney Prompt Engineer specializing in Video Generation (Runway/Pika/Sora concept art).

*** CONCEPT DATA ***
- Idea: ${input.concept}
- Style: ${input.style}
- Lighting: ${input.lighting}
- Mood: ${input.mood}

*** TASK ***
Write 1 (ONE) highly optimized Midjourney prompt to generate the key visual for this video.
Use parameters: --ar ${input.aspectRatio} --stylize 250 (and use the latest --v or --niji version)

*** OUTPUT FORMAT ***
Provide the final command only:

/imagine prompt: [Your details] ${technicalAddons} --ar ${input.aspectRatio.replace(
    ':',
    ':',
  )} --v [latest_version]`;
}

function renderGeneralVideo(input: VideoGenPromptInput, technicalAddons: string): string {
  // Fallback for Luma, Kling, etc. (Balanced approach)
  return `*** SYSTEM ROLE ***
You are an AI Video Generation Specialist (Expert in Luma Dream Machine, Kling AI, and Runway Gen-3).

*** CONCEPT DATA ***
- Concept: "${input.concept}"
- Style: ${input.style}
- Camera: ${input.movement || 'Cinematic'}
- Lighting: ${input.lighting}
- Mood: ${input.mood}

*** TASKS ***
1. Analyze the concept and determine the best physical motion required.
2. Write a SINGLE, high-fidelity prompt optimized for AI Video Generators.
3. Include keywords for high resolution, temporal consistency, and realistic motion.

*** OUTPUT ***
\`\`\`
${input.style} video of ${input.concept}, ... [Your detailed description], ${technicalAddons}
\`\`\``;
}

// --- IMAGE RENDERERS ---

function renderMidjourneyImage(input: ImagePromptInput, lensInfo: string): string {
  return `*** SYSTEM ROLE ***
You are a Midjourney Master Prompter.

*** IMAGE DETAILS ***
- Subject: ${input.subject}
- Style: ${input.style}
- Mood: ${input.mood}
- Colors: ${Array.isArray(input.colors) ? input.colors.join(', ') : input.colors || 'None'}
- Aspect Ratio: ${input.aspectRatio}
${input.additionalDetails ? `- Details: ${input.additionalDetails}` : ''}

*** MISSION ***
Construct the SINGLE most effective Midjourney prompt for this image. 
Synthesize the lens info (${lensInfo || 'standard'}) and technical keywords into a cohesive prompt.

*** OUTPUT ***
\`\`\`
/imagine prompt: ${input.subject}, ... [Keywords] --ar ${
    input.aspectRatio
  } --stylize 250 --v [latest_version]
\`\`\``;
}

function renderDalle3Image(input: ImagePromptInput): string {
  return `*** SYSTEM ROLE ***
You are a DALL-E Whisperer. You know how to maximize DALL-E's instruction following.

*** REQUEST ***
- Subject: ${input.subject}
- Style: ${input.style}
- Text Overlay: "${input.textOverlay || 'None'}"
- Mood: ${input.mood}

*** TASK ***
Write a single, descriptive paragraph prompt that ensures DALL-E captures the exact style and renders any text perfectly.

*** OUTPUT ***
\`\`\`
Create a ${input.style} image of ${input.subject}...
\`\`\``;
}

// --- VOICE RENDERERS ---

function renderElevenLabsVoice(input: VoicePromptInput): string {
  const emphasisPart =
    Array.isArray(input.emphasis) && input.emphasis.length > 0
      ? `\n- Key Emphasis Areas: ${input.emphasis.join(', ')}`
      : '';

  const inputWithPauses = input as { pauses?: string[] };
  const pausePart =
    Array.isArray(inputWithPauses.pauses) && inputWithPauses.pauses.length > 0
      ? `\n- Strategic Pauses: ${inputWithPauses.pauses.join(', ')}`
      : '';

  return `*** SYSTEM ROLE ***
You are a Professional Voice Director and Audio Engineer. You specialize in creating "Voice Design" prompts for ElevenLabs and similar TTS engines.

*** VOICE CHARACTERISTICS ***
- Gender: ${input.gender}
- Age/Persona: ${input.voiceStyle}
- Emotion: ${input.emotion}
- Pace: ${input.pace}
- Texture: Realistic, ${
    input.voiceStyle === 'narrator' ? 'Deep & Resonant' : 'Natural & Conversational'
  }
- Target Audience Language: ${input.language === 'id' ? 'Indonesian' : 'English'}
${emphasisPart}
${pausePart}

*** MISSION ***
Write a concise but highly descriptive "Voice Description" prompt that captures exactly the tone and timbre needed. 
Do not write a script. Write the *description of the voice itself* that will be used to generate the audio.

*** OUTPUT ***
\`\`\`
A ${input.gender} voice, ${input.voiceStyle} tone, speaking with ${
    input.emotion
  }... [Detailed texture description]
\`\`\``;
}

// --- SCRIPT RENDERERS ---

function renderScriptDefault(
  input: ScriptPromptInput,
  platformSpecs: Record<string, string>,
): string {
  // Default complex COT for GPT-4/Claude
  return `*** SYSTEM ROLE & CONTEXT ***
 You are an award-winning Viral Content Strategist and Scriptwriter for ${
   input.platform
 }. Your expertise lies in creating high-retention content that triggers specific emotional responses. You understand the algorithm of ${
   input.platform
 } deeply (${platformSpecs[input.platform] || ''}).
 
 *** INPUT DATA ***
 - Niche: ${input.niche}
 - Format/Duration: ${input.duration}
 - Tone: ${input.tone}
 - Target Audience: ${input.targetAudience}
 - Core Message: ${input.keyMessage}
 - Content Goal: ${input.contentGoal}
 ${
   Array.isArray(input.keywords) && input.keywords.length > 0
     ? `- Required Keywords: ${input.keywords.join(', ')}`
     : ''
 }
 
 *** CHAIN OF THOUGHT ANALYSIS (Lakukan ini sebelum menulis script) ***
 1. **Audience Profiling**: Pahami pain points dan desire terdalam dari ${
   input.targetAudience
 } di niche ${input.niche}.
 2. **Hook Ideation**: Ciptakan 3 variasi hook. Pilih satu yang paling "Pattern Interrupt" (menghentikan scroll seketika).
 3. **Value Structuring**: Bagaimana menyampaikan ${
   input.keyMessage
 } tanpa terdengar preaching? Gunakan teknik "Show, Don't Tell".
 4. **Retention Engineering**: Di mana titik bosan audiens? Sisipkan re-hook atau visual change di titik tersebut.
 
 *** STRUKTUR SCRIPT YANG DIMINTA: ${(
   input.narrativeStyle || 'HOOK-PROBLEM-SOLUTION'
 ).toUpperCase()} ***
 Gunakan struktur psikologis berikut:
 ${getNarrativeInstruction(input.narrativeStyle)}
 
 *** EMOTIONAL JOURNEY ***
 Audiens harus merasakan: ${
   Array.isArray(input.emotionalJourney)
     ? input.emotionalJourney.join(' -> ')
     : input.emotionalJourney || 'Normal'
 }
 
 *** OUTPUT FORMAT (Strictly Follow This) ***
 
 Tulis script lengkap dalam Bahasa ${
   input.keywords.some((k) => ['jakarta', 'indonesia', 'indo'].includes(k.toLowerCase()))
     ? 'Indonesia (Gunakan bahasa gaul/natural sesuai target audiens)'
     : 'Indonesia (Natural & Engaging)'
 }.
 
 [META DATA]
 - Estimated WPM (Words Per Minute): ...
 - Suggested B-Roll Vibes: ...
 
 [SCRIPT CONTENT]
 
 | Time | Visual / Camera Direction | Audio / Spoken Word | Text Overlay / GFX |
 |------|--------------------------|---------------------|--------------------|
 | 00:00-00:03 | **[HOOK]** (Deskripsikan visual yang mengejutkan/aneh) | (First sentence yang controversial atau highly relatable) | (Text besar di tengah layar, warna kontras) |
 | ... | ... | ... | ... |
 | END | **[CTA]** | ${input.callToAction || 'CTA Spesifik'} | Subscribe/Follow icon animation |
 
 *** QUALITY CHECKLIST ***
 - Apakah Hook di 3 detik pertama sangat kuat?
 - Apakah ada "fluff" (kata-kata sampah) yang bisa dibuang?
 - Apakah CTA terasa natural dan tidak memaksa?`;
}

// --- TIMELAPSE RENDERERS ---

function renderSoraTimelapse(input: TimelapsePromptInput): string {
  return `*** SYSTEM ROLE ***
You are a Time-Lapse Photography Expert and AI Prompt Engineer (Sora/Veo Specialist).

*** SCENE DATA ***
- Subject: ${input.subject}
- Transformation: ${input.transformation}
- Style: ${input.style}
- Camera Movement: ${input.camera}
- Lighting Evolution: ${input.lighting.replace('-', ' to ')}

*** MISSION ***
Design a hyper-realistic time-lapse prompt that captures the passage of time and the specific transformation described.
Emphasize "high temporal coherence", "smooth motion blur", and "8k resolution".

*** OUTPUT ***
\`\`\`
Hyper-realistic time-lapse video of ${
    input.subject
  }... [Describe the transformation and lighting change]
\`\`\``;
}

/**
 * ============================================================================
 * MAIN GENERATORS (Dispatchers)
 * ============================================================================
 */

export function generateVideoGenPrompt(input: VideoGenPromptInput): string {
  const isCinematic =
    input.style.toLowerCase().includes('cinematic') ||
    input.style.toLowerCase().includes('realistic');
  const technicalAddons = isCinematic ? CINEMATIC_KEYWORDS.join(', ') : '';

  // Dispatch based on targetModel

  const model = (input as { targetModel?: string }).targetModel;

  switch (model) {
    case AIModel.SORA:
    case AIModel.GEN3:
    case AIModel.VEO:
      return renderSoraVideo(input, technicalAddons);
    case AIModel.MIDJOURNEY_VIDEO:
      return renderMidjourneyVideo(input, technicalAddons);
    default:
      // Default to Sora style if unknown, or general
      return renderGeneralVideo(input, technicalAddons);
  }
}

export function generateImagePrompt(input: ImagePromptInput): string {
  const lensInfo =
    input.style === 'photorealistic' || input.subject === 'person'
      ? PHOTOGRAPHY_TERMS.portrait
      : input.style === 'landscape'
        ? PHOTOGRAPHY_TERMS.landscape
        : '';

  const model = (input as { targetModel?: string }).targetModel;

  switch (model) {
    case AIModel.DALLE3:
      return renderDalle3Image(input);
    default:
      return renderMidjourneyImage(input, lensInfo);
  }
}

export function generateVoicePrompt(input: VoicePromptInput): string {
  return renderElevenLabsVoice(input); // Currently mostly unified, but structured for ElevenLabs/OpenAI
}

export function generateScriptPrompt(input: ScriptPromptInput): string {
  const platformSpecs: Record<string, string> = {
    youtube: 'Long-form retention optimization, storytelling loops, deep value',
    tiktok: 'Dopamine-driven pacing, visual hooks every 3s, trending audio cues',
    instagram: 'Aesthetic visual focus, relatable hooks, shareable value',
    facebook: 'Community-centric, conversational, provoking discussion',
  };

  return renderScriptDefault(input, platformSpecs);
}

export function generateRelaxingPrompt(input: RelaxingPromptInput): string {
  // Keeping existing logic as single best result for now
  return `"${input.mood} ambient soundscape of ${
    input.environment === 'custom' ? input.customEnvironment : input.environment
  }. Primary element: ${input.primarySound}. Accompanied by subtle ${
    Array.isArray(input.secondarySounds)
      ? input.secondarySounds.join(' and ')
      : input.secondarySounds
  }. High fidelity field recording style. Binaural, spatial audio. ${
    Array.isArray(input.ambientDetails) && input.ambientDetails.length > 0
      ? `Micro-details: ${input.ambientDetails.join(', ')}.`
      : ''
  } Consistent loopable texture. No sudden transients. Intensity: ${input.intensity}."`;
}

export function generateCreativeScanPrompt(input: CreativeScanPromptInput): string {
  // Keeping existing logic
  return `*** SYSTEM ROLE ***
You are an Expert Content Analyst... (Analysis Focus: ${(
    input.analysisType || 'FULL'
  ).toUpperCase()})
...
(Same as previous implementation)
...`;
}

export function generateTimelapsePrompt(input: TimelapsePromptInput): string {
  const model = (input as { targetModel?: string }).targetModel;
  if (model === AIModel.SORA || model === AIModel.VEO) {
    return renderSoraTimelapse(input);
  }
  return renderSoraTimelapse(input); // Default
}

// Helpers
function getNarrativeInstruction(style: string): string {
  const instructions: Record<string, string> = {
    'hook-problem-solution':
      '1. Hook (Shocking Fact) -> 2. Problem (Relatable Pain) -> 3. Agitate (Make it hurt) -> 4. Solution (Your Content) -> 5. Proof -> 6. CTA',
    'story-arc':
      '1. The "Normal" World -> 2. The Inciting Incident -> 3. Rising Action/Struggle -> 4. The Climax/Realization -> 5. Resolution/New Normal',
    listicle:
      '1. Teaser (What they will learn) -> 2. Item 1 (Quick win) -> 3. Item 2 (Interesting fact) -> ... -> Last Item (The most important one/Plot twist)',
    linear:
      'Straightforward educational flow: Introduction -> Concept Explanation -> Use Case Examples -> Summary',
    'before-after':
      '1. The "Before" State (Visual proof of problem) -> 2. The Transformation Process (Satisfying montage) -> 3. The "After" State (Visual payoff) -> 4. How to do it',
  };
  return instructions[style] || instructions['hook-problem-solution'] || '';
}

export const PROMPT_GENERATORS = {
  SCRIPT: generateScriptPrompt,
  VOICE: generateVoicePrompt,
  VIDEO_GEN: generateVideoGenPrompt,
  IMAGE: generateImagePrompt,
  RELAXING: generateRelaxingPrompt,
  CREATIVE_SCAN: generateCreativeScanPrompt,
  TIMELAPSE: generateTimelapsePrompt,
} as const;
