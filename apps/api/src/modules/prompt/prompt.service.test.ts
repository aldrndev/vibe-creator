import { describe, expect, it } from 'vitest';
import { promptService } from './prompt.service';

describe('Prompt Service Generator Templates', () => {
  it('generates a real Creative Scan analysis prompt with focus areas', () => {
    const input: Record<string, unknown> = {
      type: 'CREATIVE_SCAN',
      niche: 'gaming',
      sourceUrl: 'https://youtube.com/watch?v=123',
      analysisType: 'hook',
      focusAreas: ['opening-hook', 'pacing'],
      extractedFrames: [],
    };

    const prompt = promptService.generatePromptFromInput('CREATIVE_SCAN', input);
    expect(prompt).toContain('### SYSTEM ROLE');
    expect(prompt).toContain('gaming');
    expect(prompt).toContain('https://youtube.com/watch?v=123');
    expect(prompt).toContain('opening-hook, pacing');
    expect(prompt).not.toContain('(Same as previous implementation)');
  });

  it('generates universal image prompts with Flux and Midjourney sections', () => {
    const input: Record<string, unknown> = {
      type: 'IMAGE',
      subject: 'futuristic city',
      style: 'cyberpunk',
      aspectRatio: '16:9',
      purpose: 'thumbnail',
      mood: 'intense',
      colors: ['neon blue', 'pink'],
      textOverlay: 'NEO TOKYO',
    };

    const prompt = promptService.generatePromptFromInput('IMAGE', input);
    expect(prompt).toContain('FLUX & DALL-E 3');
    expect(prompt).toContain('MIDJOURNEY');
    expect(prompt).toContain('NEO TOKYO');
  });

  it('generates universal image prompts with negative prompt if provided', () => {
    const input: Record<string, unknown> = {
      type: 'IMAGE',
      subject: 'wooden cabin',
      style: 'photorealistic',
      aspectRatio: '16:9',
      purpose: 'cover',
      mood: 'cozy',
      colors: ['warm tones'],
      negativePrompt: 'blurry, distorted',
    };

    const prompt = promptService.generatePromptFromInput('IMAGE', input);
    expect(prompt).toContain('FLUX & DALL-E 3');
    expect(prompt).toContain('MIDJOURNEY');
    expect(prompt).toContain('NEGATIVE PROMPT (Avoid):');
    expect(prompt).toContain('blurry, distorted');
  });

  it('handles Relaxing prompt custom environment, intensity and seamless options', () => {
    const input: Record<string, unknown> = {
      type: 'RELAXING',
      environment: 'custom',
      customEnvironment: 'mystic cave in the clouds',
      primarySound: 'wind chimes',
      secondarySounds: ['distant thunder'],
      ambientDetails: ['echoes', 'soft wind'],
      duration: '1hour',
      mood: 'peaceful',
      intensity: 'immersive',
      loopSeamless: true,
    };

    const prompt = promptService.generatePromptFromInput('RELAXING', input);
    expect(prompt).toContain('mystic cave in the clouds');
    expect(prompt).toContain('Intensity: immersive');
    expect(prompt).toContain('Consistent loopable texture.');
    expect(prompt).not.toContain('undefined');
  });

  it('generates a script prompt with emotional journey and critical guidelines', () => {
    const input: Record<string, unknown> = {
      type: 'SCRIPT',
      niche: 'cooking',
      platform: 'youtube',
      duration: '3min',
      tone: 'casual',
      targetAudience: 'home cooks',
      keyMessage: 'cook steak perfectly',
      contentGoal: 'education',
      narrativeStyle: 'hook-problem-solution',
      emotionalJourney: ['hungry', 'excited', 'satisfied'],
      keywords: ['steak', 'cooking tip'],
    };

    const prompt = promptService.generatePromptFromInput('SCRIPT', input);
    expect(prompt).toContain('### EMOTIONAL JOURNEY');
    expect(prompt).toContain('hungry -> excited -> satisfied');
    expect(prompt).toContain('### CRITICAL WRITING GUIDELINES');
    expect(prompt).toContain('Avoid all AI clichés');
  });

  it('generates talking head avatar setup prompt', () => {
    const input: Record<string, unknown> = {
      type: 'TALKING_HEAD',
      avatar: 'professional man',
      background: 'modern office',
      framing: 'medium-close-up',
      voiceStyle: 'friendly',
      script: 'Welcome to our platform!',
    };

    const prompt = promptService.generatePromptFromInput('TALKING_HEAD', input);
    expect(prompt).toContain('### SYSTEM ROLE');
    expect(prompt).toContain('professional man');
    expect(prompt).toContain('modern office');
    expect(prompt).toContain('Welcome to our platform!');
  });

  it('generates social copy with copywriting anti-cliche guidelines', () => {
    const input: Record<string, unknown> = {
      type: 'SOCIAL_COPY',
      platform: 'instagram',
      niche: 'fitness',
      tone: 'motivational',
      hookType: 'question',
      hashtagDensity: 'medium',
      keywords: ['workout', 'gym'],
    };

    const prompt = promptService.generatePromptFromInput('SOCIAL_COPY', input);
    expect(prompt).toContain('### SYSTEM ROLE');
    expect(prompt).toContain('### SPECIFICATIONS');
    expect(prompt).toContain('Variation 1: Short & Punchy');
    expect(prompt).toContain('### CRITICAL COPYWRITING GUIDELINES');
    expect(prompt).toContain('Avoid all AI clichés');
  });
});
