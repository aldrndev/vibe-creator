import { describe, expect, it } from 'vitest';
import {
  buildYtDlpDownloadArgs,
  buildYtDlpInfoArgs,
  YT_DLP_FALLBACK_FORMAT_SELECTOR,
  YT_DLP_PRIMARY_FORMAT_SELECTOR,
} from '../../services/download.ytdlp.service';

describe('downloadYtDlpService argument builders', () => {
  it('builds metadata arguments with the source URL as the last argument', () => {
    const url = 'https://www.youtube.com/watch?v=abc123';
    const args = buildYtDlpInfoArgs(url);

    expect(args.at(-1)).toBe(url);
    expect(args).toContain('--skip-download');
    expect(args).toContain('youtube:player_client=android');
  });

  it('builds primary download arguments with best-quality selector and mp4 merge', () => {
    const url = 'https://www.youtube.com/watch?v=abc123';
    const outputPath = '/tmp/video.mp4';
    const args = buildYtDlpDownloadArgs(url, outputPath, YT_DLP_PRIMARY_FORMAT_SELECTOR);

    expect(args).toEqual([
      '-f',
      YT_DLP_PRIMARY_FORMAT_SELECTOR,
      '--merge-output-format',
      'mp4',
      '--no-check-certificates',
      '--newline',
      '--no-playlist',
      '--extractor-args',
      'youtube:player_client=android',
      '-o',
      outputPath,
      url,
    ]);
  });

  it('adds a max filesize guard when a byte limit is provided', () => {
    const url = 'https://www.youtube.com/watch?v=abc123';
    const outputPath = '/tmp/video.mp4';
    const args = buildYtDlpDownloadArgs(url, outputPath, YT_DLP_PRIMARY_FORMAT_SELECTOR, {
      maxBytes: 750 * 1024 * 1024,
    });

    expect(args).toContain('--max-filesize');
    expect(args).toContain('750M');
    expect(args.at(-1)).toBe(url);
  });

  it('keeps a deterministic fallback selector for compatibility', () => {
    expect(YT_DLP_FALLBACK_FORMAT_SELECTOR).toBe(
      'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
    );
  });
});
