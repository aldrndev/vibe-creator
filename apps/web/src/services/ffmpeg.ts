import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type ProgressCallback = (progress: number) => void;

interface TrimOptions {
  startTime: number;
  endTime: number;
  onProgress?: ProgressCallback;
}

interface ThumbnailOptions {
  time: number;
  width?: number;
  height?: number;
}

interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  codec: string;
}

/**
 * FFmpeg.wasm service for client-side video processing
 * Singleton pattern with lazy loading
 */
class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private loading = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Load FFmpeg.wasm (lazy, single instance)
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    if (this.loading && this.loadPromise) {
      return this.loadPromise;
    }

    this.loading = true;
    this.loadPromise = this.doLoad();
    
    try {
      await this.loadPromise;
      this.loaded = true;
    } finally {
      this.loading = false;
    }
  }

  private async doLoad(): Promise<void> {
    this.ffmpeg = new FFmpeg();

    // Load FFmpeg core from CDN with CORS support
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }

  /**
   * Check if FFmpeg is ready
   */
  isReady(): boolean {
    return this.loaded && this.ffmpeg !== null;
  }

  /**
   * Get video information (duration, dimensions, codec)
   */
  async getVideoInfo(file: File): Promise<VideoInfo> {
    await this.load();
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

    const inputName = 'input.' + file.name.split('.').pop();
    await this.ffmpeg.writeFile(inputName, await fetchFile(file));

    // Use ffprobe-like approach by running ffmpeg with -i only
    // FFmpeg will output info to stderr which we can parse
    let duration = 0;
    let width = 0;
    let height = 0;
    let codec = 'unknown';

    this.ffmpeg.on('log', ({ message }) => {
      // Parse duration: Duration: 00:00:10.50
      const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (durationMatch) {
        const [, hours, minutes, seconds, centiseconds] = durationMatch;
        duration = 
          parseInt(hours || '0') * 3600 + 
          parseInt(minutes || '0') * 60 + 
          parseInt(seconds || '0') + 
          parseInt(centiseconds || '0') / 100;
      }

      // Parse dimensions: 1920x1080
      const dimensionMatch = message.match(/(\d{3,4})x(\d{3,4})/);
      if (dimensionMatch) {
        width = parseInt(dimensionMatch[1] || '0');
        height = parseInt(dimensionMatch[2] || '0');
      }

      // Parse codec: Video: h264
      const codecMatch = message.match(/Video: (\w+)/);
      if (codecMatch) {
        codec = codecMatch[1] || 'unknown';
      }
    });

    // Run ffmpeg just to get info (will fail but logs are captured)
    try {
      await this.ffmpeg.exec(['-i', inputName, '-f', 'null', '-']);
    } catch {
      // Expected to fail, we just want the logs
    }

    await this.ffmpeg.deleteFile(inputName);

    return { duration, width, height, codec };
  }

  /**
   * Extract a thumbnail at a specific time
   */
  async extractThumbnail(
    file: File, 
    options: ThumbnailOptions
  ): Promise<Blob> {
    await this.load();
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

    const inputName = 'input.' + file.name.split('.').pop();
    const outputName = 'thumbnail.jpg';

    await this.ffmpeg.writeFile(inputName, await fetchFile(file));

    const args = [
      '-i', inputName,
      '-ss', options.time.toString(),
      '-vframes', '1',
    ];

    if (options.width && options.height) {
      args.push('-vf', `scale=${options.width}:${options.height}`);
    }

    args.push('-q:v', '2', outputName);

    await this.ffmpeg.exec(args);

    const data = await this.ffmpeg.readFile(outputName);
    
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);

    return new Blob([data as BlobPart], { type: 'image/jpeg' });
  }

  /**
   * Extract multiple thumbnails for timeline preview
   */
  async extractTimelineThumbnails(
    file: File,
    count: number = 10,
    height: number = 60
  ): Promise<string[]> {
    await this.load();
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

    const info = await this.getVideoInfo(file);
    const interval = info.duration / count;
    const thumbnails: string[] = [];

    for (let i = 0; i < count; i++) {
      const time = i * interval;
      const blob = await this.extractThumbnail(file, { 
        time, 
        height,
        width: Math.round(height * (info.width / info.height)),
      });
      thumbnails.push(URL.createObjectURL(blob));
    }

    return thumbnails;
  }

  /**
   * Trim video (fast copy mode when possible)
   */
  async trimVideo(
    file: File,
    options: TrimOptions
  ): Promise<Blob> {
    await this.load();
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

    const extension = file.name.split('.').pop() || 'mp4';
    const inputName = `input.${extension}`;
    const outputName = `output.${extension}`;

    await this.ffmpeg.writeFile(inputName, await fetchFile(file));

    // Set up progress tracking
    if (options.onProgress) {
      const duration = options.endTime - options.startTime;
      this.ffmpeg.on('progress', ({ time }) => {
        const progress = Math.min(time / duration, 1);
        if (options.onProgress) options.onProgress(progress);
      });
    }

    // Use stream copy for fast trimming (no re-encoding)
    await this.ffmpeg.exec([
      '-ss', options.startTime.toString(),
      '-i', inputName,
      '-t', (options.endTime - options.startTime).toString(),
      '-c', 'copy', // Stream copy for speed
      '-avoid_negative_ts', 'make_zero',
      outputName,
    ]);

    const data = await this.ffmpeg.readFile(outputName);
    
    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);

    return new Blob([data as BlobPart], { type: `video/${extension}` });
  }

  /**
   * Concatenate multiple video clips
   */
  async concatenateClips(
    clips: Array<{ file: File; startTime: number; endTime: number }>,
    onProgress?: ProgressCallback
  ): Promise<Blob> {
    await this.load();
    if (!this.ffmpeg) throw new Error('FFmpeg not loaded');

    // First, trim each clip
    const trimmedFiles: string[] = [];
    const totalDuration = clips.reduce((sum, c) => sum + (c.endTime - c.startTime), 0);
    let processedDuration = 0;

    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      if (!clip) continue;
      const clipDuration = clip.endTime - clip.startTime;
      
      const trimmedBlob = await this.trimVideo(clip.file, {
        startTime: clip.startTime,
        endTime: clip.endTime,
        onProgress: onProgress ? (p) => {
          const clipProgress = processedDuration + (p * clipDuration);
          onProgress(clipProgress / totalDuration * 0.8); // 80% for trimming
        } : undefined,
      });

      const trimmedName = `trimmed_${i}.mp4`;
      await this.ffmpeg.writeFile(trimmedName, await fetchFile(trimmedBlob));
      trimmedFiles.push(trimmedName);
      
      processedDuration += clipDuration;
    }

    // Create concat file list
    const concatList = trimmedFiles.map(f => `file '${f}'`).join('\n');
    await this.ffmpeg.writeFile('concat.txt', concatList);

    // Concatenate
    await this.ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c', 'copy',
      'output.mp4',
    ]);

    if (onProgress) onProgress(0.95);

    const data = await this.ffmpeg.readFile('output.mp4');

    // Cleanup
    for (const f of trimmedFiles) {
      await this.ffmpeg.deleteFile(f);
    }
    await this.ffmpeg.deleteFile('concat.txt');
    await this.ffmpeg.deleteFile('output.mp4');

    if (onProgress) onProgress(1);

    return new Blob([data as BlobPart], { type: 'video/mp4' });
  }

  /**
   * Cleanup resources
   */
  terminate(): void {
    if (this.ffmpeg) {
      this.ffmpeg.terminate();
      this.ffmpeg = null;
      this.loaded = false;
    }
  }
}

// Singleton export
export const ffmpegService = new FFmpegService();
