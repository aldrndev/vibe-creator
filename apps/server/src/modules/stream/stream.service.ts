import { logger } from '@/lib/logger';
import { spawn, ChildProcess } from 'child_process';
import { prisma } from '@/lib/prisma';

// Store active streams
const activeStreams = new Map<string, ChildProcess>();

type StreamPlatform = 'youtube' | 'tiktok' | 'twitch' | 'facebook' | 'instagram' | 'custom';

interface StreamConfig {
  platform: StreamPlatform;
  rtmpUrl: string;
  streamKey: string;
}

interface StartStreamInput {
  userId: string;
  inputPath: string; // Video file to stream in loop
  config: StreamConfig;
}

/**
 * Get RTMP ingest URL for platform
 */
function getRtmpUrl(platform: StreamPlatform, streamKey: string, customUrl?: string): string {
  const rtmpServers: Record<StreamPlatform, string> = {
    youtube: 'rtmp://a.rtmp.youtube.com/live2',
    tiktok: 'rtmp://push.tiktokv.us/live',
    twitch: 'rtmp://live.twitch.tv/app',
    facebook: 'rtmps://live-api-s.facebook.com:443/rtmp',
    instagram: 'rtmps://live-upload.instagram.com:443/rtmp',
    custom: customUrl || '',
  };
  
  return `${rtmpServers[platform]}/${streamKey}`;
}

/**
 * Stream service for RTMP live streaming
 */
export const streamService = {
  /**
   * Start streaming video to RTMP server
   */
  async startStream(input: StartStreamInput): Promise<{ streamId: string }> {
    const { userId, inputPath, config } = input;
    
    // Create stream record
    const stream = await prisma.streamSession.create({
      data: {
        userId,
        platform: config.platform,
        status: 'STARTING',
        startedAt: new Date(),
      },
    });
    
    const rtmpUrl = getRtmpUrl(config.platform, config.streamKey, config.rtmpUrl);
    
    // FFmpeg command to stream video in loop
    const args = [
      '-re', // Read input at native frame rate
      '-stream_loop', '-1', // Loop forever
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-maxrate', '3000k',
      '-bufsize', '6000k',
      '-pix_fmt', 'yuv420p',
      '-g', '50', // Keyframe interval
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-f', 'flv',
      rtmpUrl,
    ];
    
    const process = spawn('ffmpeg', args);
    
    // Store process reference
    activeStreams.set(stream.id, process);
    
    process.stderr.on('data', (data) => {
      logger.debug({ streamId: stream.id, data: data.toString() }, 'ffmpeg stream stderr');
    });
    
    process.on('close', async (code) => {
      activeStreams.delete(stream.id);
      
      await prisma.streamSession.update({
        where: { id: stream.id },
        data: {
          status: code === 0 ? 'ENDED' : 'FAILED',
          endedAt: new Date(),
        },
      });
      
      logger.info({ streamId: stream.id, code }, 'Stream ended');
    });
    
    process.on('error', async (err) => {
      activeStreams.delete(stream.id);
      
      await prisma.streamSession.update({
        where: { id: stream.id },
        data: {
          status: 'FAILED',
          endedAt: new Date(),
          errorMessage: err.message,
        },
      });
      
      logger.error({ streamId: stream.id, error: err.message }, 'Stream error');
    });
    
    // Update status to LIVE after a short delay
    setTimeout(async () => {
      if (activeStreams.has(stream.id)) {
        await prisma.streamSession.update({
          where: { id: stream.id },
          data: { status: 'LIVE' },
        });
      }
    }, 3000);
    
    return { streamId: stream.id };
  },

  /**
   * Stop an active stream
   */
  async stopStream(streamId: string, userId: string): Promise<void> {
    const stream = await prisma.streamSession.findFirst({
      where: { id: streamId, userId },
    });
    
    if (!stream) {
      throw new Error('Stream not found');
    }
    
    const process = activeStreams.get(streamId);
    if (process) {
      process.kill('SIGTERM');
      activeStreams.delete(streamId);
    }
    
    await prisma.streamSession.update({
      where: { id: streamId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });
    
    logger.info({ streamId }, 'Stream stopped');
  },

  /**
   * Get stream status
   */
  async getStreamStatus(streamId: string, userId: string) {
    const stream = await prisma.streamSession.findFirst({
      where: { id: streamId, userId },
    });
    
    if (!stream) {
      throw new Error('Stream not found');
    }
    
    const isActive = activeStreams.has(streamId);
    
    return {
      ...stream,
      isActive,
    };
  },

  /**
   * Get user's stream history
   */
  async getHistory(userId: string, limit = 20) {
    return prisma.streamSession.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  },

  /**
   * Get active streams for user
   */
  async getActiveStreams(userId: string) {
    return prisma.streamSession.findMany({
      where: { 
        userId,
        status: { in: ['STARTING', 'LIVE'] },
      },
    });
  },
};
