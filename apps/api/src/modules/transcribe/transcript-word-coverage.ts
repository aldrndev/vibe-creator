const TRANSCRIPT_TOKEN_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

/**
 * Split transcript text into comparable tokens for coverage checks.
 */
export function tokenizeTranscriptText(text: string): string[] {
  const normalizedText = text.normalize('NFKC').toLowerCase();
  const unicodeTokens = normalizedText.match(TRANSCRIPT_TOKEN_PATTERN);

  if (unicodeTokens?.length) {
    return unicodeTokens;
  }

  return normalizedText
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

/**
 * Return true when word timestamps cover every visible token in the segment text.
 */
export function hasCompleteWordTextCoverage(segmentText: string, wordTexts: string[]): boolean {
  const expectedTokens = tokenizeTranscriptText(segmentText);
  if (expectedTokens.length === 0) {
    return true;
  }

  const actualTokens = tokenizeTranscriptText(wordTexts.join(' '));
  if (actualTokens.length < expectedTokens.length) {
    return false;
  }

  let expectedCursor = 0;
  for (const actualToken of actualTokens) {
    if (actualToken === expectedTokens[expectedCursor]) {
      expectedCursor += 1;
    }

    if (expectedCursor >= expectedTokens.length) {
      return true;
    }
  }

  return false;
}
