import { describe, expect, it } from 'vitest';
import {
  createDirectorImportError,
  isExpiredDirectorSessionError,
  normalizeDirectorImportErrorMessage,
  readDirectorApiData,
  readDirectorApiSuccess,
} from './import-session-recovery';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('isExpiredDirectorSessionError', () => {
  it('detects a Gone response as an expired session', () => {
    const error = createDirectorImportError(
      jsonResponse({ success: false, message: 'Gone' }, 410),
      { success: false, message: 'Gone' },
      'fallback',
    );

    expect(isExpiredDirectorSessionError(error)).toBe(true);
  });

  it('detects SESSION_EXPIRED API codes case-insensitively', () => {
    const error = createDirectorImportError(
      jsonResponse({ success: false, errorCode: 'session_expired' }, 400),
      { success: false, errorCode: 'session_expired' },
      'fallback',
    );

    expect(isExpiredDirectorSessionError(error)).toBe(true);
  });

  it('detects English and Indonesian expired messages', () => {
    expect(isExpiredDirectorSessionError(new Error('Session already expired'))).toBe(true);
    expect(isExpiredDirectorSessionError(new Error('Sesi sudah kedaluwarsa'))).toBe(true);
  });

  it('ignores unrelated import errors', () => {
    expect(isExpiredDirectorSessionError(new Error('Upload failed'))).toBe(false);
  });
});

describe('readDirectorApiData', () => {
  it('returns typed data from a successful Director API envelope', async () => {
    await expect(
      readDirectorApiData<{ readonly id: string }>(
        jsonResponse({ success: true, data: { id: 'session-1' } }, 200),
        'fallback',
      ),
    ).resolves.toEqual({ id: 'session-1' });
  });

  it('throws a recoverable expired-session error from a failed envelope', async () => {
    await expect(
      readDirectorApiData(
        jsonResponse({ success: false, errorCode: 'SESSION_EXPIRED' }, 400),
        'fallback',
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'SESSION_EXPIRED',
    });
  });

  it('preserves response status even when the body is not JSON', async () => {
    await expect(
      readDirectorApiData(new Response('gone', { status: 410 }), 'fallback'),
    ).rejects.toMatchObject({
      statusCode: 410,
      message: 'fallback',
    });
  });
});

describe('readDirectorApiSuccess', () => {
  it('accepts successful action envelopes without data', async () => {
    await expect(
      readDirectorApiSuccess(jsonResponse({ success: true }, 200), 'fallback'),
    ).resolves.toBeUndefined();
  });

  it('throws failed action envelopes', async () => {
    await expect(
      readDirectorApiSuccess(
        jsonResponse({ success: false, error: { message: 'Action failed' } }, 400),
        'fallback',
      ),
    ).rejects.toMatchObject({
      message: 'Action failed',
      statusCode: 400,
    });
  });
});

describe('normalizeDirectorImportErrorMessage', () => {
  it('turns short video backend errors into a product validation message', () => {
    expect(
      normalizeDirectorImportErrorMessage(
        new Error('Video is too short for this workflow'),
        'fallback',
      ),
    ).toBe(
      'Video terlalu pendek. AI Director butuh video minimal 5 menit. Untuk video pendek, gunakan Video Studio.',
    );
  });

  it('keeps unrelated errors intact', () => {
    expect(normalizeDirectorImportErrorMessage(new Error('Upload gagal'), 'fallback')).toBe(
      'Upload gagal',
    );
  });

  it('normalizes interrupted uploads without implying a higher Import URL limit', () => {
    const error = Object.assign(new Error('network failed'), {
      errorCode: 'DIRECTOR_UPLOAD_INTERRUPTED',
    });

    expect(normalizeDirectorImportErrorMessage(error, 'fallback')).toBe(
      'Upload terputus. Coba lagi dengan koneksi stabil, atau gunakan Import URL jika video tersedia di sumber yang didukung.',
    );
  });

  it('normalizes unsupported URL errors', () => {
    const error = Object.assign(new Error('URL not supported'), {
      errorCode: 'UNSUPPORTED_SOURCE',
    });

    expect(normalizeDirectorImportErrorMessage(error, 'fallback')).toBe(
      'Sumber URL belum didukung. Gunakan YouTube, TikTok, Instagram, Facebook, atau upload file langsung.',
    );
  });
});
