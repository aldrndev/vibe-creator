const livePreviewFilenamePattern = /^live-preview-[a-f0-9]{40}\.mp4$/;

export function isValidLivePreviewFilename(filename: string): boolean {
  return livePreviewFilenamePattern.test(filename);
}

export function buildLivePreviewUrls(sessionId: string, previewFileName: string) {
  return {
    previewUrl: `/api/v1/director/sessions/${sessionId}/export/preview/${previewFileName}`,
    downloadUrl: `/api/v1/director/sessions/${sessionId}/export/preview/${previewFileName}/download`,
  };
}
