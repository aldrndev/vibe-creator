import type {
  CreativeScanPromptInput,
  ImagePromptInput,
  RelaxingPromptInput,
  ScriptPromptInput,
  SocialCopyPromptInput,
  TalkingHeadPromptInput,
  VideoGenPromptInput,
  VoicePromptInput,
} from '../types/prompt';
import { generateLoopSourcePrompt } from './loop-source-prompts';

/**
 * ============================================================================
 * MAIN GENERATORS (Dispatchers)
 * ============================================================================
 */

export function generateVideoGenPrompt(input: VideoGenPromptInput): string {
  const parts = [
    `### SYSTEM ROLE
You are a Lead Visual Effects Director and Prompt Engineer specializing in AI Video Generation (Runway Gen-4.5, Kling 3.5, Luma v2, and HunyuanVideo).

### VISUAL CONCEPT
- Concept: "${input.concept}"
- Style: ${input.style}
- Camera Movement: ${input.movement || 'Cinematic/Dynamic'}
- Lighting: ${input.lighting || 'Natural/Cinematic'}
- Mood: ${input.mood || 'Balanced'}
- Aspect Ratio: ${input.aspectRatio || '16:9'}
- Target Duration: ${input.duration || '10s'}`,
  ];

  if (input.motionStrength) {
    parts.push(`- Motion Strength: ${input.motionStrength}`);
  }
  if (input.fps) {
    parts.push(`- Frame Rate: ${input.fps}`);
  }
  if (input.additionalDetails) {
    parts.push(`- Additional Visual Details: ${input.additionalDetails}`);
  }

  parts.push(`
### PROMPT ENGINEERING TASK
Generate a single, highly detailed visual prompt optimized for modern AI Video Generators.
Describe:
1. The Core Action and Narrative: The subject, movement, and timing.
2. Camera Setup & Lens: Specify lenses (e.g., anamorphic lens, 35mm, 85mm) and composition (e.g., extreme close-up, wide tracking shot, Dutch angle, rule of thirds).
3. Cinematic Lighting: Volumetric lighting, soft diffusers, high-contrast chiaroscuro, lens flares, or golden hour.
4. Rendering & Texture: High-fidelity textures (e.g., skin pores, fabric weave, dust motes in light beams, cinematic depth of field, ray-traced reflections).
5. Temporal Consistency & Physics: Clear directives for physical motion solidity, realistic fluid dynamics, and smooth, consistent temporal execution without artifacts.

### OUTPUT FORMAT
Provide the final optimized prompt inside a code block:

\`\`\`
[Optimized prompt here]
\`\`\``);

  if (input.negativePrompt) {
    parts.push(`\n### NEGATIVE PROMPT (Avoid):
"${input.negativePrompt}"`);
  }

  return parts.join('\n');
}

export function generateImagePrompt(input: ImagePromptInput): string {
  const parts = [
    `### SYSTEM ROLE
You are a master AI Image Prompt Engineer (specializing in FLUX.1 Pro, Midjourney v7, and DALL-E 3).

### IMAGE SPECIFICATIONS
- Subject/Scene: ${input.subject}
- Style: ${input.style}
- Purpose: ${input.purpose || 'General'}
- Mood/Atmosphere: ${input.mood || 'Balanced'}
- Color Scheme: ${Array.isArray(input.colors) ? input.colors.join(', ') : input.colors || 'Natural'}`,
  ];

  if (input.cameraLens) {
    parts.push(`- Camera & Lens settings: ${input.cameraLens}`);
  }
  if (input.textOverlay) {
    parts.push(`- Text Overlay (Render exactly): "${input.textOverlay}"`);
  }
  if (input.brand) {
    parts.push(`- Brand Context: ${input.brand}`);
  }
  if (input.additionalDetails) {
    parts.push(`- Additional Details: ${input.additionalDetails}`);
  }

  parts.push(`
### PROMPT ENGINEERING MISSION
1. Generate a descriptive natural language prompt (optimized for FLUX & DALL-E 3) describing:
   - Photorealistic textures (skin texture, fabric weave, surface micro-details).
   - Camera lens & Composition (e.g., 85mm f/1.4 portrait lens, 35mm street photography lens, anamorphic crop, Rule of Thirds, extreme close-up, low-angle hero shot).
   - Volumetric lighting and atmosphere (e.g., cinematic volumetric haze, soft directional key light, rim lighting, neon reflection on wet pavement).
2. Provide a separate Midjourney optimized copy that appends the required parameters (e.g., \`--ar ${input.aspectRatio || '16:9'} --stylize 250\`).

### OUTPUT FORMAT
Provide the final prompts inside code blocks:

#### FLUX & DALL-E 3 (Natural Language Prompt):
\`\`\`
[Your Flux prompt here]
\`\`\`

#### MIDJOURNEY (Imagine Command):
\`\`\`
/imagine prompt: ${input.subject}, ... [Your visual prompt]${input.cameraLens ? `, ${input.cameraLens}` : ''} --ar ${input.aspectRatio || '16:9'} --stylize 250
\`\`\``);

  if (input.negativePrompt) {
    parts.push(`\n#### NEGATIVE PROMPT (Avoid):
\`\`\`
${input.negativePrompt}
\`\`\``);
  }

  return parts.join('\n');
}

export function generateVoicePrompt(input: VoicePromptInput): string {
  const parts = [
    `### SYSTEM ROLE
You are a professional Voice Director and Sound Engineer for AI TTS (ElevenLabs, OpenAI TTS, and Cartesia).

### VOICE DESIGN DATA
- Voice Style/Persona: ${input.voiceStyle}
- Language: ${input.language === 'id' ? 'Indonesian' : 'English'}
- Gender: ${input.gender}
- Primary Emotion: ${input.emotion || 'Natural'}
- Speaking Pace: ${input.pace}`,
  ];

  if (input.voiceId) {
    parts.push(`- Voice Character Reference: ${input.voiceId}`);
  }
  if (Array.isArray(input.emphasis) && input.emphasis.length > 0) {
    parts.push(`- Emphasis Areas: ${input.emphasis.join(', ')}`);
  }
  if (Array.isArray(input.pausePoints) && input.pausePoints.length > 0) {
    parts.push(`- Pause Styles: ${input.pausePoints.join(', ')}`);
  }

  parts.push(`
### MISSION
Write a descriptive "Voice Design Description" that captures the precise tone, timbre, age, and emotional delivery.

### CRITICAL TTS MARKUP DIRECTIVES
- Place strategic pause tags like \`<break time="1.0s"/>\` at natural breathing points.
- Use hyphens (-) for brief, natural pauses within a sentence.
- Use ellipsis (...) to simulate hesitation, suspense, or emotional transitions.
- Use CAPITAL LETTERS to denote strong emphasis on specific key words.
- Add descriptive emotional tone indicators in brackets, e.g., [excitedly], [thoughtfully], [whispering], [sighs], to guide pronunciation and pitch when using advanced expressive TTS models.

### OUTPUT FORMAT
Provide the description and TTS advice:
\`\`\`
[Voice description for TTS configuration]
\`\`\``);

  return parts.join('\n');
}

export function generateScriptPrompt(input: ScriptPromptInput): string {
  const platformSpecs: Record<string, string> = {
    youtube: 'Long-form retention optimization, storytelling loops, deep value',
    tiktok: 'Dopamine-driven pacing, visual hooks every 3s, trending audio cues',
    instagram: 'Aesthetic visual focus, relatable hooks, shareable value',
    facebook: 'Community-centric, conversational, provoking discussion',
  };

  const parts = [
    `### SYSTEM ROLE & CONTEXT
You are an award-winning Viral Content Creator and Scriptwriter. Your expertise lies in creating high-retention video scripts for ${input.platform}.
Platform characteristics: ${platformSpecs[input.platform] || 'Video pacing and retention optimization'}

### INPUT DATA
- Niche: ${input.niche}
- Duration: ${input.duration}
- Tone: ${input.tone}
- Target Audience: ${input.targetAudience}
- Core Message: ${input.keyMessage}
- Content Goal: ${input.contentGoal}
- Narrative Style: ${input.narrativeStyle}`,
  ];

  if (input.language) {
    parts.push(`- Target Language: ${input.language}`);
  }
  if (input.hookStyle) {
    parts.push(`- Opening Hook Style: ${input.hookStyle}`);
  }
  if (Array.isArray(input.keywords) && input.keywords.length > 0) {
    parts.push(`- Required Keywords: ${input.keywords.join(', ')}`);
  }
  if (input.additionalContext) {
    parts.push(`- Additional Context: ${input.additionalContext}`);
  }

  parts.push(`
### NARRATIVE STRUCTURE INSTRUCTIONS
Use the following storytelling arc:
${getNarrativeInstruction(input.narrativeStyle)}

### EMOTIONAL JOURNEY
Audiens harus merasakan: ${
    Array.isArray(input.emotionalJourney)
      ? input.emotionalJourney.join(' -> ')
      : input.emotionalJourney || 'Normal'
  }

### CRITICAL WRITING GUIDELINES
- Avoid all AI clichés, overused transitions, and robotic intros (e.g., "In today's fast-paced world", "delve", "tapestry", "more than just", "testament").
- Write in a natural, high-retention, human-like conversational tone. Use short punchy sentences to maximize audial clarity.

### OUTPUT FORMAT
Tulis script lengkap dalam bahasa ${input.language || 'Indonesia (Natural & Engaging)'}.
Gunakan format markdown tabel untuk script:

| Time | Visual / Camera Direction | Audio / Spoken Word | Text Overlay / GFX |
|------|--------------------------|---------------------|--------------------|
| 00:00-00:03 | **[HOOK]** (Deskripsikan visual pembuka ${input.hookStyle ? `bertipe ${input.hookStyle}` : ''}) | (First sentence hook) | (Hook text overlay) |
| ... | ... | ... | ... |
| END | **[CTA]** | ${input.callToAction || 'CTA'} | Follow/Subscribe animation |`);

  return parts.join('\n');
}

export function generateRelaxingPrompt(input: RelaxingPromptInput): string {
  const customEnv = (input as { customEnvironment?: string }).customEnvironment;
  const loopSeamlessVal = input.loopSeamless !== false;
  return `"A peaceful ${input.mood} ambient soundscape of ${
    input.environment === 'custom' ? customEnv || 'a custom environment' : input.environment
  }. Primary element: ${input.primarySound}. Accompanied by subtle ${
    Array.isArray(input.secondarySounds)
      ? input.secondarySounds.join(' and ')
      : input.secondarySounds
  }. High fidelity field recording style. Binaural, spatial audio. ${
    Array.isArray(input.ambientDetails) && input.ambientDetails.length > 0
      ? `Micro-details: ${input.ambientDetails.join(', ')}.`
      : ''
  } ${loopSeamlessVal ? 'Consistent loopable texture. No sudden transients.' : ''} Intensity: ${input.intensity || 'moderate'}."`;
}

export function generateCreativeScanPrompt(input: CreativeScanPromptInput): string {
  const focusAreasPart =
    Array.isArray(input.focusAreas) && input.focusAreas.length > 0
      ? `- Key Focus Areas: ${input.focusAreas.join(', ')}`
      : '';

  return `### SYSTEM ROLE
You are an Expert Content Analyst and Viral Video Strategist. Your task is to perform a detailed audit of a competitor's content to extract hook patterns, structural pacing, and conversion elements.

### ANALYSIS CONFIGURATION
- Niche/Category: ${input.niche}
- Source URL: ${input.sourceUrl || 'Provided by user'}
- Analysis Focus: ${(input.analysisType || 'FULL').toUpperCase()}
${focusAreasPart}

### AUDIT METHODOLOGY
1. Point interrupt (first 3 seconds): identify visual/audio patterns used to stop scroll.
2. Map the retention structure: identify transition points, visual changes, and pacing spikes.
3. Identify key value statements or emotional hooks.
4. Analyze the Call to Action (CTA) placement and wording.

### OUTPUT FORMAT
Provide a detailed structured breakdown containing:
1. **Hook Quality Rating** (Score 1-10) and explanation.
2. **Retention Timeline** (0-3s, 3-15s, 15s-end).
3. **Viral Elements** (What made this video perform well?).
4. **Actionable Recommendations** (How to adapt this formula for a new video).`;
}

export function generateTalkingHeadPrompt(input: TalkingHeadPromptInput): string {
  const parts = [
    `### SYSTEM ROLE
You are an expert Producer for AI Avatar and Talking Head presentations (HeyGen, Synthesia, and D-ID).

### CONFIGURATION
- Avatar Persona: ${input.avatar}
- Background environment: ${input.background}
- Framing/Camera Shot: ${input.framing}
- Voice Tone Style: ${input.voiceStyle}`,
  ];

  if (input.voiceId) {
    parts.push(`- Voice Character Reference: ${input.voiceId}`);
  }
  if (input.additionalDetails) {
    parts.push(`- Extra Visual/Framing details: ${input.additionalDetails}`);
  }

  parts.push(`
### AVATAR SCRIPT CONTENT
"${input.script}"

### MISSION
Design a complete talking-head script configuration. Output the visual directives for framing/background setup and then write the final spoken speech formatted cleanly, noting any natural facial expression triggers (like smile, gesture, pause) that HeyGen/Synthesia can read.

### OUTPUT FORMAT
\`\`\`
[Avatar Speech & Visual Setup directives]
\`\`\``);

  return parts.join('\n');
}

export function generateSocialCopyPrompt(input: SocialCopyPromptInput): string {
  const parts = [
    `### SYSTEM ROLE
You are a Social Media Copywriter and Growth Hacker. You write high-converting caption copy and hooks.

### SPECIFICATIONS
- Platform: ${input.platform}
- Niche: ${input.niche}
- Tone of Voice: ${input.tone}
- Opening Hook Type: ${input.hookType}
- Hashtag Density: ${input.hashtagDensity}`,
  ];

  if (Array.isArray(input.keywords) && input.keywords.length > 0) {
    parts.push(`- Target Keywords: ${input.keywords.join(', ')}`);
  }
  if (input.additionalContext) {
    parts.push(`- Context / Offer details: ${input.additionalContext}`);
  }

  parts.push(`
### MISSION
Write 3 variations of engaging caption copy for the post. 
- Variation 1: Short & Punchy (High dopamine/scroll stopper)
- Variation 2: Storytelling (Hook -> Story -> CTA)
- Variation 3: Value/Listicle (Educational bullets)
Each variation must end with a clear Call to Action and appropriate trending hashtags corresponding to density: ${input.hashtagDensity}.

### CRITICAL COPYWRITING GUIDELINES
- Avoid all AI clichés, overused transitions, and robotic intros (e.g., "look no further", "delve", "tapestry", "in today's digital landscape", "revolutionary", "game-changer", "elevate").
- Write in a natural, high-converting, human-like voice that matches the tone. Use active voice and avoid fluff.

### OUTPUT FORMAT
Provide the copy variations in clean markdown sections.`);

  return parts.join('\n');
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
  LOOP_SOURCE: generateLoopSourcePrompt,
  TALKING_HEAD: generateTalkingHeadPrompt,
  SOCIAL_COPY: generateSocialCopyPrompt,
} as const;
