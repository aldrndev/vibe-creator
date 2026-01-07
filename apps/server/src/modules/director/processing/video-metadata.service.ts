/**
 * Video Metadata Service
 * Handles FFmpeg probing for metadata
 */

import { spawn } from "child_process";

const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";

export const videoMetadataService = {
  /**
   * Get minimal video metadata (duration)
   */
  async getVideoMetadata(inputPath: string): Promise<{ duration: number }> {
    return new Promise((resolve) => {
      const args = ["-i", inputPath];
      const proc = spawn(ffmpegPath, args);
      let output = "";

      proc.stderr.on("data", (data) => {
        output += data.toString();
      });

      proc.on("close", () => {
        const match = output.match(/Duration:\s+(\d{2}):(\d{2}):(\d{2}\.\d+)/);
        if (match) {
          const [_, h, m, s] = match;
          const duration =
            parseFloat(h!) * 3600 + parseFloat(m!) * 60 + parseFloat(s!);
          resolve({ duration });
        } else {
          resolve({ duration: 0 });
        }
      });
    });
  },
};
