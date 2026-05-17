import { describe, expect, it } from 'vitest';
import {
  getModernExportAssetReference,
  getModernExportErrorMessage,
  getModernExportOverallProgress,
  getModernExportPhaseLabel,
} from '@/hooks/use-modern-export';

describe('modern export errors', () => {
  it('maps raw export failures to user-friendly messages', () => {
    expect(
      getModernExportErrorMessage(new Error('Export requires at least one video or image layer.')),
    ).toBe('Tambahkan minimal satu video atau gambar sebelum export.');
    expect(getModernExportErrorMessage(new Error('Compilation failed: asset missing'))).toBe(
      'Project belum siap diexport. Cek lagi asset, timing, dan layer yang masih kosong.',
    );
    expect(
      getModernExportErrorMessage(new Error('Export quota exceeded. Please upgrade your plan.')),
    ).toBe('Kuota export kamu habis. Coba akun dengan quota tersedia atau upgrade plan.');
  });

  it('uses stable backend references for project and studio assets', () => {
    expect(
      getModernExportAssetReference({
        id: 'asset-project',
        name: 'music.wav',
        type: 'AUDIO',
        url: 'blob:music',
        serverAssetId: 'project-asset-id',
      }),
    ).toBe('project-asset:project-asset-id');

    expect(
      getModernExportAssetReference({
        id: 'asset-studio',
        name: 'Meme Pop',
        type: 'AUDIO',
        url: '/api/v1/video-studio/assets/meme-pop/preview',
        studioAssetId: 'meme-pop',
      }),
    ).toBe('studio-asset:meme-pop');
  });

  it('maps server render progress without an artificial starting jump', () => {
    expect(getModernExportOverallProgress(0)).toBe(0);
    expect(getModernExportOverallProgress(1)).toBe(0.96);
    expect(getModernExportOverallProgress(-1)).toBe(0);
    expect(getModernExportOverallProgress(2)).toBe(0.96);
    expect(getModernExportOverallProgress(0.5)).toBeCloseTo(0.48);
  });

  it('returns readable phase labels', () => {
    expect(getModernExportPhaseLabel('queueing')).toBe('Membuat job export');
    expect(getModernExportPhaseLabel('processing')).toBe('Merender video');
    expect(getModernExportPhaseLabel('completed')).toBe('Export selesai');
  });
});
