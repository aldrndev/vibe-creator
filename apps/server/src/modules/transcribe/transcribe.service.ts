import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { directorProcessor } from "../director/director.processor";
import { whisperRunner } from "./whisper-runner";
import { transcribeNormalizer } from "./transcribe-normalizer";
import path from "path";
import fs from "fs/promises";
import { env } from "@/config/env";

export const transcribeService = {
  /**
   * Orchestrate transcription for a single selected clip:
   * 1. Extract audio proxy
   * 2. Run Whisper
   * 3. Normalize segments
   * 4. Update DB
   */
  async transcribeSelectedClip(selectedClipId: string): Promise<void> {
    const selectedClip = await prisma.directorSelectedClip.findUnique({
      where: { id: selectedClipId },
      include: {
        session: { include: { asset: true } },
        candidate: true,
      },
    });

    if (!selectedClip || !selectedClip.session.asset) {
      throw new Error("Selected clip or asset not found");
    }

    const { session, candidate, trimStartMs, trimEndMs } = selectedClip;
    const { storageKey } = session.asset as any;

    // Determine effective time range
    // If user trimmed, use trim times relative to candidate
    // Candidate start/end are absolute in the video
    // Trim is usually absolute too? or offset?
    // Looking at schema: trimStartMs, trimEndMs default 0.
    // Usually trim is relative to the clip start? Or replacing clip start?
    // Let's assume standard behavior: Clip is defined by candidate.startMs and endMs.
    // But refined steps allow Trimming?
    // If DirectorSelectedClip has trimStartMs/trimEndMs > 0, does it mean "absolute time in video"
    // or "offset from candidate start"?
    // In many edit systems:
    //    candidate is the rough cut.
    //    selectedClip is the refined cut.
    //    If trimStartMs is 0, it means use candidate start?
    //    Or is trimStartMs the ACTUAL start time?
    // User plan said "Extract audio proxy(videoPath, clipStartMs, clipEndMs)".
    // Let's assume we use the actual range to be used in final video.
    // If trimStartMs != 0, use it. Else use candidate.startMs.
    // Actually, usually trimStartMs/EndMs in DB override candidate if set?
    // Or maybe trimStartMs IS the start time.

    // Let's look at `director.service.ts` or `director.processor.ts` usage normally.
    // But for now, safe bet:
    // start = trimStartMs > 0 ? trimStartMs : candidate.startMs
    // end = trimEndMs > 0 ? trimEndMs : candidate.endMs

    const startMs = trimStartMs > 0 ? trimStartMs : candidate.startMs;
    const endMs = trimEndMs > 0 ? trimEndMs : candidate.endMs;

    // Fix: Resolve input path correctly using MEDIA_INPUT_DIR
    // storageKey might be 'uploads/director/xyz.mp4' or 'director/xyz.mp4'
    // We want: MEDIA_INPUT_DIR/director/xyz.mp4 (assuming MEDIA_INPUT_DIR is /app/uploads)
    const cleanStorageKey = storageKey.replace(/^uploads\//, ""); // Strip leading 'uploads/' if present
    const inputPath = path.join(env.MEDIA_INPUT_DIR, cleanStorageKey);
    const audioProxyDir = path.join(env.TEMP_DIR, "director/audio-proxies");

    // Debug logging
    logger.info(
      {
        selectedClipId,
        storageKey,
        cleanStorageKey,
        inputPath,
        audioProxyDir,
        mediaInputDir: env.MEDIA_INPUT_DIR,
        tempDir: env.TEMP_DIR,
      },
      "Transcribe: Resolving paths"
    );

    // Ensure proxy dir exists
    await fs.mkdir(audioProxyDir, { recursive: true });

    let audioProxyPath = "";

    try {
      // 1. Extract Audio
      audioProxyPath = await directorProcessor.extractClipAudioProxy(
        inputPath,
        audioProxyDir,
        startMs,
        endMs
      );

      // 2. Run Whisper
      const result = await whisperRunner.runWhisperOnAudio(audioProxyPath);

      if (!result.success || !result.segments) {
        throw new Error(result.error || "Whisper returned no segments");
      }

      // 3. Normalize
      const normalizedSegments = transcribeNormalizer.normalizeSegments(
        result.segments
      );

      // 4. Persist to DB
      await prisma.directorClipTranscript.upsert({
        where: { selectedClipId },
        create: {
          sessionId: session.id,
          selectedClipId,
          status: "COMPLETED",
          engine: "WHISPER_LOCAL",
          language: result.language,
          segments: normalizedSegments as any, // Prisma Json compatibility
          completedAt: new Date(),
        },
        update: {
          status: "COMPLETED",
          segments: normalizedSegments as any,
          language: result.language,
          errorMessage: null,
          completedAt: new Date(),
        },
      });

      logger.info(
        { selectedClipId, segCount: normalizedSegments.length },
        "Clip transcription completed"
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      logger.error({ selectedClipId, err }, "Clip transcription failed");

      // Update DB to FAILED
      await prisma.directorClipTranscript.upsert({
        where: { selectedClipId },
        create: {
          sessionId: session.id,
          selectedClipId,
          status: "FAILED",
          engine: "WHISPER_LOCAL",
          errorMessage: errorMsg,
        },
        update: {
          status: "FAILED",
          errorMessage: errorMsg,
          completedAt: new Date(), // Mark as done (failed)
        },
      });

      throw err; // Re-throw to fail the worker job (allowing retry)
    } finally {
      // Cleanup temp audio
      if (audioProxyPath) {
        try {
          await fs.unlink(audioProxyPath);
        } catch (e) {
          // ignore
        }
      }
    }
  },
};
