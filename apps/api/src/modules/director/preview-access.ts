interface PreviewCandidate {
  previewStorageKey?: string | null;
}

function hasMatchingPreviewFilename(
  previewStorageKey: string | null | undefined,
  filename: string,
): boolean {
  const normalizedFileName = previewStorageKey?.split('/').pop() ?? '';
  return normalizedFileName === filename;
}

export function canAccessPreviewFile(
  filename: string,
  sessionCandidates: PreviewCandidate[],
  selectedClipCandidates: PreviewCandidate[],
  reusableCandidates: PreviewCandidate[],
): boolean {
  return [...sessionCandidates, ...selectedClipCandidates, ...reusableCandidates].some(
    (candidate) => hasMatchingPreviewFilename(candidate.previewStorageKey, filename),
  );
}
