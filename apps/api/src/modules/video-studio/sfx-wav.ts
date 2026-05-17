import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { StudioSfxPayload } from './video-studio.schemas';

const SAMPLE_RATE = 44_100;
const BITS_PER_SAMPLE = 16;
const CHANNEL_COUNT = 1;
const WAV_HEADER_BYTES = 44;
const INT16_MAX = 0x7fff;
const UINT_32_MAX = 0xffffffff;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.max(min, Math.min(max, value));
}

function createSeededNoise(seedText: string): () => number {
  let seed = 0x811c9dc5;
  for (let index = 0; index < seedText.length; index++) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 0x01000193) >>> 0;
  }

  return () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return (seed / UINT_32_MAX) * 2 - 1;
  };
}

function getEnvelope(sampleIndex: number, totalSamples: number, payload: StudioSfxPayload): number {
  const attackSamples = Math.max(1, Math.round((payload.attackMs / 1000) * SAMPLE_RATE));
  const releaseSamples = Math.max(1, Math.round((payload.releaseMs / 1000) * SAMPLE_RATE));
  const attack = clamp(sampleIndex / attackSamples, 0, 1);
  const release = clamp((totalSamples - sampleIndex) / releaseSamples, 0, 1);

  return Math.min(attack, release);
}

function getSweepFrequency(payload: StudioSfxPayload, progress: number): number {
  const endFrequencyHz = payload.endFrequencyHz ?? payload.frequencyHz;
  return payload.frequencyHz + (endFrequencyHz - payload.frequencyHz) * progress;
}

function getWaveSample(
  payload: StudioSfxPayload,
  seconds: number,
  progress: number,
  noise: () => number,
): number {
  const frequency = getSweepFrequency(payload, progress);
  const phase = 2 * Math.PI * frequency * seconds;

  switch (payload.waveform) {
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1;
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case 'noise':
      return noise();
    case 'sweep':
      return Math.sin(phase);
    case 'pop':
      return Math.sin(phase) * Math.exp(-progress * 5);
    case 'thump':
      return Math.sin(phase) * Math.exp(-progress * 7);
    case 'whoosh':
      return noise() * Math.sin(Math.PI * progress);
    case 'sine':
      return Math.sin(phase);
  }
}

function writeWavHeader(buffer: Buffer, dataBytes: number): void {
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNEL_COUNT, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE((SAMPLE_RATE * CHANNEL_COUNT * BITS_PER_SAMPLE) / 8, 28);
  buffer.writeUInt16LE((CHANNEL_COUNT * BITS_PER_SAMPLE) / 8, 32);
  buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
}

/**
 * Creates a small deterministic WAV buffer for built-in Video Studio SFX assets.
 */
export function createStudioSfxWavBuffer(payload: StudioSfxPayload): Buffer {
  const totalSamples = Math.max(1, Math.round((payload.durationMs / 1000) * SAMPLE_RATE));
  const dataBytes = totalSamples * 2;
  const buffer = Buffer.alloc(WAV_HEADER_BYTES + dataBytes);
  const noise = createSeededNoise(payload.fileName);

  writeWavHeader(buffer, dataBytes);

  for (let index = 0; index < totalSamples; index++) {
    const seconds = index / SAMPLE_RATE;
    const progress = totalSamples <= 1 ? 1 : index / (totalSamples - 1);
    const envelope = getEnvelope(index, totalSamples, payload);
    const sample = getWaveSample(payload, seconds, progress, noise);
    const amplitude = clamp(sample * payload.volume * envelope, -1, 1);
    buffer.writeInt16LE(Math.round(amplitude * INT16_MAX), WAV_HEADER_BYTES + index * 2);
  }

  return buffer;
}

/**
 * Materializes a deterministic SFX asset into an allowlisted local media path.
 */
export async function writeStudioSfxWavFile(
  payload: StudioSfxPayload,
  outputPath: string,
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, createStudioSfxWavBuffer(payload));
}
