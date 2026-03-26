/**
 * Waveform Generator Worker
 * Decodes audio and generates waveform data off the main thread
 */

interface WaveformRequest {
  type: 'generate';
  audioData: ArrayBuffer;
  assetId: string;
  samplesPerSecond: number; // Resolution of waveform
}

interface WaveformResponse {
  type: 'progress' | 'complete' | 'error';
  assetId: string;
  progress?: number;
  waveform?: Float32Array;
  duration?: number;
  error?: string;
}

// Process audio and generate waveform
async function generateWaveform(
  audioData: ArrayBuffer,
  samplesPerSecond: number = 100,
): Promise<{ waveform: Float32Array; duration: number }> {
  // Create offline audio context
  const audioContext = new OfflineAudioContext(1, 1, 44100);

  // Decode audio
  const audioBuffer = await audioContext.decodeAudioData(audioData);
  const channelData = audioBuffer.getChannelData(0);

  const duration = audioBuffer.duration;
  const totalSamples = Math.ceil(duration * samplesPerSecond);
  const samplesPerBucket = Math.floor(channelData.length / totalSamples);

  const waveform = new Float32Array(totalSamples);

  // Calculate peak amplitude for each sample bucket
  for (let i = 0; i < totalSamples; i++) {
    const start = i * samplesPerBucket;
    const end = Math.min(start + samplesPerBucket, channelData.length);

    let max = 0;
    for (let j = start; j < end; j++) {
      const value = Math.abs(channelData[j] ?? 0);
      if (value > max) max = value;
    }

    waveform[i] = max;
  }

  return { waveform, duration };
}

// Worker message handler
self.onmessage = async (event: MessageEvent<WaveformRequest>) => {
  const { type, audioData, assetId, samplesPerSecond } = event.data;

  if (type !== 'generate') return;

  try {
    // Send progress update
    self.postMessage({
      type: 'progress',
      assetId,
      progress: 10,
    } satisfies WaveformResponse);

    const result = await generateWaveform(audioData, samplesPerSecond);

    // Send complete with waveform data
    self.postMessage({
      type: 'complete',
      assetId,
      waveform: result.waveform,
      duration: result.duration,
    } satisfies WaveformResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      assetId,
      error: error instanceof Error ? error.message : 'Failed to generate waveform',
    } satisfies WaveformResponse);
  }
};

export {};
