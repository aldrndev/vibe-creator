import { join, dirname, basename } from "path";
import { existsSync, readdirSync } from "fs";
import { rename } from "fs/promises";
import { logger } from "@/lib/logger";

// Detect platform from URL
export function detectPlatform(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  if (url.includes("tiktok.com")) return "tiktok";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  if (url.includes("facebook.com") || url.includes("fb.watch"))
    return "facebook";
  if (url.includes("vimeo.com")) return "vimeo";
  if (url.includes("reddit.com")) return "reddit";
  if (url.includes("sora.chatgpt.com")) return "sora";
  if (url.startsWith("http://") || url.startsWith("https://")) return "generic";
  return "unknown";
}

// Check if URL is a Sora video
export function isSoraUrl(url: string): boolean {
  return (
    url.includes("sora.chatgpt.com") &&
    url.match(/(s_[0-9A-Za-z_-]{8,})/) !== null
  );
}

// Check if URL is a direct video link
export function isDirectVideoUrl(url: string): boolean {
  const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"];
  const urlLower = url.toLowerCase();
  return videoExtensions.some((ext) => urlLower.includes(ext));
}

/**
 * Find actual downloaded file and rename to expected path
 * yt-dlp sometimes adds extensions or changes filename
 */
export async function findAndRenameDownload(
  expectedPath: string
): Promise<string> {
  // If exact file exists, we're good
  if (existsSync(expectedPath)) {
    return expectedPath;
  }

  const dir = dirname(expectedPath);
  const baseWithoutExt = basename(expectedPath, ".mp4");

  // Look for files that start with our UUID
  const files = readdirSync(dir);
  const candidates = files.filter(
    (f) =>
      f.startsWith(baseWithoutExt) &&
      (f.endsWith(".mp4") || f.endsWith(".webm") || f.endsWith(".mkv"))
  );

  if (candidates.length === 0) {
    throw new Error(`Downloaded file not found. Expected: ${expectedPath}`);
  }

  // Use the first matching file
  const firstCandidate = candidates[0];
  if (!firstCandidate) {
    throw new Error(`Downloaded file not found. Expected: ${expectedPath}`);
  }
  const actualPath = join(dir, firstCandidate);

  if (actualPath !== expectedPath) {
    await rename(actualPath, expectedPath);
    logger.info(
      { from: actualPath, to: expectedPath },
      "Renamed download file"
    );
  }

  return expectedPath;
}
