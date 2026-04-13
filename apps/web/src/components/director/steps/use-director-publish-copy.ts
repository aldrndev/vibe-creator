import { useEffect, useMemo, useState } from 'react';
import {
  derivePublishPack,
  type PublishPack,
} from '@/components/director/steps/editing-publish-copy';
import { api } from '@/services/api';
import type { DirectorSession, SelectedClip } from '@/stores/director-store';

export interface PublishPackResult extends PublishPack {
  source: 'ai' | 'heuristic';
  provider: 'openai' | 'ollama' | 'heuristic';
  notice: {
    mode: 'ai' | 'fallback';
    message: string;
    attemptedProviders?: Array<'openai' | 'ollama'>;
    lastError?: string | null;
  };
}

export function useDirectorPublishCopy(
  activeSession: DirectorSession | null,
  selectedClips: SelectedClip[],
) {
  const activeSessionId = activeSession?.id ?? null;
  const fallbackPack = useMemo(() => derivePublishPack(selectedClips), [selectedClips]);
  const [publishPack, setPublishPack] = useState<PublishPackResult>({
    ...fallbackPack,
    source: 'heuristic',
    provider: 'heuristic',
    notice: {
      mode: 'fallback',
      message: 'Copy publish instan untuk short final siap dipakai sambil menunggu AI.',
    },
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [requestNonce, setRequestNonce] = useState(0);

  const clipSignature = useMemo(
    () =>
      JSON.stringify(
        selectedClips.map((clip) => ({
          id: clip.id,
          score: clip.candidate.score,
          transcript: clip.transcript?.segments?.map((segment) => segment.text).join(' ') ?? '',
        })),
      ),
    [selectedClips],
  );
  useEffect(() => {
    setPublishPack({
      ...fallbackPack,
      source: 'heuristic',
      provider: 'heuristic',
      notice: {
        mode: 'fallback',
        message: 'Copy publish instan untuk short final siap dipakai sambil menunggu AI.',
      },
    });
  }, [fallbackPack]);

  useEffect(() => {
    if (!activeSessionId || clipSignature === '[]') {
      setIsGenerating(false);
      return;
    }

    const isManualRetry = requestNonce > 0;
    let isActive = true;
    setIsGenerating(true);
    if (isManualRetry) {
      setPublishPack((current) => ({
        ...current,
        notice: {
          mode: current.source === 'ai' ? 'ai' : 'fallback',
          message: 'Mencoba mengambil ulang copy publish short dari AI...',
          attemptedProviders: current.notice.attemptedProviders,
          lastError: current.notice.lastError,
        },
      }));
    }

    void api
      .get<PublishPackResult>(`/director/sessions/${activeSessionId}/publish-copy`)
      .then((response) => {
        if (!isActive || !response.success) {
          return;
        }

        setPublishPack(response.data);
      })
      .finally(() => {
        if (isActive) {
          setIsGenerating(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeSessionId, clipSignature, requestNonce]);

  return {
    publishPack,
    isGenerating,
    retryPublishCopy: () => {
      setRequestNonce((current) => current + 1);
    },
  };
}
