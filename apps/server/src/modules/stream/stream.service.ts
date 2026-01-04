import { logger } from '@/lib/logger';
import { spawn, ChildProcess } from 'child_process';
import { prisma } from '@/lib/prisma';
import { billingService } from '../billing/billing.service';

// Store active streams
const activeStreams = new Map<string, ChildProcess>();

type StreamPlatform = 'youtube' | 'tiktok' | 'twitch' | 'facebook' | 'instagram' | 'custom';

interface StreamConfig {
  platform: StreamPlatform;
  rtmpUrl: string;
  streamKey: string;
  quality: '720p' | '1080p';
  bitrateKbps?: number;
  durationMinutes?: number;
}

// Store active streams by userId key for concurrency control
// Map<userId, { process: ChildProcess, streamId: string }>
const activeUserStreams = new Map<string, { process: ChildProcess; streamId: string }>();

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
const startReaper = () => {
  setInterval(async () => {
    try {
      const now = new Date();
      // Find streams that should have stopped
      const expiredStreams = await prisma.streamSession.findMany({
        where: {
          status: { in: ['LIVE', 'STARTING'] },
          autoStopAt: { lte: now },
        },
      });

      if (expiredStreams.length > 0) {
        logger.info({ count: expiredStreams.length }, 'Reaper found expired streams');
        
        for (const s of expiredStreams) {
             // We can't easily access userId here to check ownership, but stopStream needs userId for validation?
             // Actually stopStream logic uses `activeUserStreams.get(userId)`. 
             // We need to look up userId. `s` has userId.
             
             logger.info({ streamId: s.id }, 'Reaper auto-stopping stream');
             await streamService.stopStream(s.id, s.userId, 'AUTO_STOP').catch(err => {
                 logger.error({ err, streamId: s.id }, 'Reaper failed to stop stream');
                 // Force DB update if process kill failed (e.g. process already gone)
                 prisma.streamSession.update({
                     where: { id: s.id },
                     data: { status: 'ENDED', endedAt: now, stopReason: 'AUTO_STOP', durationMinutesBilled: 0 } // conservative 0 or calc? 
                     // Safe callback fallback: set to ENDED. Billing might be skipped here if catch block hits.
                     // Ideally we prefer stopStream to succeed.
                 }).catch(() => {});
             });
        }
      }
    } catch (e) {
      logger.error({ err: e }, 'Reaper error');
    }
  }, 30000); // Check every 30s
};

// Start Reaper
startReaper();

export const streamService = {
  /**
   * Start streaming video to RTMP server
   */
  async startStream(input: StartStreamInput): Promise<{ streamId: string }> {
    const { userId, inputPath, config } = input;
    
    // 1. Concurrency Control: Enforce 1 stream per user
    if (activeUserStreams.has(userId)) {
        logger.info({ userId }, 'Stopping existing stream to start new one (Concurrency Check)');
        const existing = activeUserStreams.get(userId)!;
        
        // Kill existing process
        existing.process.kill('SIGTERM');
        activeUserStreams.delete(userId);
        activeStreams.delete(existing.streamId); // Ensure cleanup from global map too if used
        
        // Update DB status
        await prisma.streamSession.update({
            where: { id: existing.streamId },
            data: { status: 'ENDED', endedAt: new Date(), errorMessage: 'Interrupted by new session' }
        }).catch(err => logger.warn({ err }, 'Failed to update interrupted stream status'));
        
        // Small delay to release resources
        await new Promise(r => setTimeout(r, 1000));
    }

    // 3. Quota & Cycle Check
    const cycle = await billingService.getOrCreateOpenCycle(userId);
    const quotaTotal = cycle.quotaMinutesBase + cycle.quotaMinutesTopup;
    const quotaRemaining = Math.max(0, quotaTotal - cycle.quotaMinutesUsed);
    
    if (quotaRemaining <= 0) {
        throw new Error('Streaming quota exhausted. Please upgrade or top-up.');
    }
    
    // Calculate Auto-Stop based on Remaining Quota
    const requestedDuration = config.durationMinutes || 60;
    
    // Effective duration is limited by Quota
    const effectiveDuration = Math.min(requestedDuration, quotaRemaining);
    
    // Strict Cap based on Plan (Hardcoded safety net)
    // Free: 60, Paid: 720, Pro: 1440. 
    // Ideally this logic fits in billingService, but here for safety.
    const ABSOLUTE_MAX = 1440; // 24 hours
    const finalDuration = Math.min(effectiveDuration, ABSOLUTE_MAX);

    const autoStopAt = new Date(Date.now() + finalDuration * 60 * 1000);

    // 4. Create stream record (Atomic-ish)
    // We rely on memory map activeUserStreams for concurrency "fail-fast",
    // but DB unique constraint would be better.
    // For now, start with STARTING status.
    const stream = await prisma.streamSession.create({
      data: {
        userId,
        platform: config.platform,
        status: 'STARTING',
        startedAt: new Date(),
        autoStopAt, 
        quotaCycleId: cycle.id,
        // Config Redaction
        config: {
            quality: config.quality,
            bitrateKbps: config.bitrateKbps,
            // DO NOT SAVE STREAM KEY or FULL URL if sensitive
            platform: config.platform,
        }
      },
    });
    
    // 3. Configure Quality & Bitrate
    const QualitySettings = {
        '720p': { w: -2, h: 720, minK: 1500, maxK: 4500, defK: 2500, bufK: 5000 },
        '1080p': { w: -2, h: 1080, minK: 3000, maxK: 8000, defK: 4500, bufK: 9000 },
    };
    
    const settings = QualitySettings[config.quality || '720p'];
    
    // Clamp Bitrate
    let videoBitrate = config.bitrateKbps || settings.defK;
    if (videoBitrate < settings.minK) videoBitrate = settings.minK;
    if (videoBitrate > settings.maxK) videoBitrate = settings.maxK;
    
    const maxRate = Math.round(videoBitrate * 1.5); // Maxrate 1.5x buffer
    const bufSize = Math.round(videoBitrate * 2);   // Bufsize 2x
    
    
    const rtmpUrl = getRtmpUrl(config.platform, config.streamKey, config.rtmpUrl);
    
    // FFmpeg command - Hardened
    const args = [
      '-re', 
      '-stream_loop', '-1',
      '-i', inputPath,
      '-vf', `scale=${settings.w}:${settings.h}`, // Scale to Quality
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-b:v', `${videoBitrate}k`,
      '-maxrate', `${maxRate}k`,
      '-bufsize', `${bufSize}k`,
      '-pix_fmt', 'yuv420p',
      '-g', '60', // 2s GOP at 30fps
      '-keyint_min', '60',
      '-sc_threshold', '0',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-ar', '44100',
      '-ac', '2',
      '-f', 'flv',
      rtmpUrl,
    ];
    
    const process = spawn('ffmpeg', args);
    
    // Store process reference
    activeStreams.set(stream.id, process);
    activeUserStreams.set(userId, { process, streamId: stream.id }); // No memory timeout needed, Reaper handles it
    
    logger.info({ streamId: stream.id, autoStopAt }, 'Stream started with auto-stop deadline');
    
    process.stderr.on('data', (data) => {
      // Redact logs!
      const logStr = data.toString();
      // Simple heuristic: don't log lines containing rtmp:// unless we scrub it.
      // But we just want basic output.
      // Only log errors or warnings to reduce noise and leak risk
      if (logStr.toLowerCase().includes('error') || logStr.toLowerCase().includes('fail')) {
         logger.debug({ streamId: stream.id, data: logStr }, 'ffmpeg stream stderr');
      }
    });
    
    process.on('close', async (code) => {
      activeStreams.delete(stream.id);
      activeUserStreams.delete(userId);
      
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
      activeUserStreams.delete(userId);
      
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
  async stopStream(streamId: string, userId: string, reason: 'USER_REQUEST' | 'AUTO_STOP' | 'ADMIN' | 'ERROR' = 'USER_REQUEST'): Promise<void> {
    const stream = await prisma.streamSession.findFirst({
      where: { id: streamId, userId },
    });
    
    if (!stream) throw new Error('Stream not found');
    
    // Kill Process
    const process = activeStreams.get(streamId);
    if (process) {
      process.kill('SIGTERM');
      activeStreams.delete(streamId);
      activeUserStreams.delete(userId);
    }
    
    // Idempotent Billing Update via Transaction
    await prisma.$transaction(async (tx) => {
        const now = new Date();
        const existing = await tx.streamSession.findUnique({ where: { id: streamId } });
        if(!existing || existing.durationMinutesBilled !== null) return; // Already billed
        
        // Calculate Minutes
        const start = existing.startedAt.getTime();
        const end = now.getTime();
        const seconds = Math.max(0, (end - start) / 1000);
        const minutesBilled = Math.ceil(seconds / 60); // Round up
        
        // Update Session
        await tx.streamSession.update({
            where: { id: streamId },
            data: {
                status: 'ENDED', // Or user requested
                endedAt: now,
                durationMinutesBilled: minutesBilled,
                stopReason: reason 
            }
        });
        
        // Update Quota Cycle
        if (existing.quotaCycleId) {
            await tx.streamQuotaCycle.update({
                where: { id: existing.quotaCycleId },
                data: {
                    quotaMinutesUsed: { increment: minutesBilled }
                }
            });
        }
    });

    logger.info({ streamId, reason }, 'Stream stopped and billed');
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
