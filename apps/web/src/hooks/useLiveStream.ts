import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { authFetch } from '@/services/api';
import {
  createDefaultLiveStreamDocument,
  createLiveStreamProject,
  createLiveStreamProjectTitle,
  getActiveStream,
  getLiveStreamSourceInfo,
  getStreamQuota,
  getStreamStatus,
  type LiveStreamProjectDocument,
  type LiveStreamSourceInfo,
  loadLiveStreamProject,
  type StreamQuota,
  saveLiveStreamProject,
  startLiveStreamProject,
  stopStream,
  uploadLiveStreamSourceAsset,
} from '@/services/live-stream-project-api';

export type StreamPlatform = 'youtube' | 'tiktok' | 'twitch' | 'facebook' | 'instagram' | 'custom';

interface UseLiveStreamOptions {
  readonly sessionId?: string | null;
}

function createDocumentPatch(
  document: LiveStreamProjectDocument,
  patch: Partial<LiveStreamProjectDocument>,
): LiveStreamProjectDocument {
  return {
    ...document,
    ...patch,
    savedAt: new Date().toISOString(),
  };
}

const metadataNumberSchema = z.number().finite().nonnegative();

export function useLiveStream(options: UseLiveStreamOptions = {}) {
  const [projectId, setProjectId] = useState<string | null>(options.sessionId ?? null);
  const [projectTitle, setProjectTitle] = useState('Live Stream Baru');
  const [document, setDocument] = useState<LiveStreamProjectDocument>(() =>
    createDefaultLiveStreamDocument(),
  );
  const [sourceInfo, setSourceInfo] = useState<LiveStreamSourceInfo | undefined>();
  const [videoUrl, setVideoUrl] = useState('');
  const [isHydrating, setIsHydrating] = useState(Boolean(options.sessionId));

  const [streamKey, setStreamKey] = useState('');
  const [isStreamKeyVisible, setIsStreamKeyVisible] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string>('');
  const [streamStatus, setStreamStatus] = useState<string>('');

  const [quota, setQuota] = useState<StreamQuota | null>(null);
  const [showTopup, setShowTopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoUrlRef = useRef<string>('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearVideoObjectUrl = useCallback(() => {
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = '';
    }
  }, []);

  const saveDraft = useCallback(
    (nextDocument: LiveStreamProjectDocument, nextTitle = projectTitle) => {
      if (!projectId) return;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveLiveStreamProject(projectId, nextTitle, nextDocument).catch((error: Error) => {
          logger.warn('Failed to autosave live stream project', { error: error.message });
        });
      }, 450);
    },
    [projectId, projectTitle],
  );

  const updateDocument = useCallback(
    (patch: Partial<LiveStreamProjectDocument>) => {
      setDocument((current) => {
        const next = createDocumentPatch(current, patch);
        saveDraft(next, patch.title ?? projectTitle);
        return next;
      });
    },
    [projectTitle, saveDraft],
  );

  const pollStatus = useCallback((id: string) => {
    if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
    statusIntervalRef.current = setInterval(async () => {
      try {
        const status = await getStreamStatus(id);
        setStreamStatus(status.status);
        setIsStreaming(
          Boolean(status.isActive) || ['STARTING', 'LIVE', 'STOPPING'].includes(status.status),
        );
        if (status.status === 'ENDED' || status.status === 'FAILED') {
          if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
          setQuota(await getStreamQuota().catch(() => null));
        }
      } catch {
        // Polling error is non-fatal; next interval can recover.
      }
    }, 5000);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      // options.sessionId is guaranteed to be a string here
      const session = await loadLiveStreamProject(options.sessionId as string);
      if (cancelled) return;
      setProjectId(session.id);
      setProjectTitle(session.title);
      setDocument(session.document);
      setSourceInfo(session.sourceInfo);
      if (session.sourceVideoUrl) {
        clearVideoObjectUrl();
        videoUrlRef.current = session.sourceVideoUrl;
        setVideoUrl(session.sourceVideoUrl);
      }
    };

    async function hydrate() {
      if (!options.sessionId) {
        setIsHydrating(false);
        return;
      }

      try {
        await loadSession();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Gagal membuka draft Live Streaming.';
        setErrorMessage(message);
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [clearVideoObjectUrl, options.sessionId]);

  useEffect(() => {
    async function restoreRuntime() {
      const [active, quotaData] = await Promise.all([
        getActiveStream().catch(() => null),
        getStreamQuota().catch(() => null),
      ]);
      if (active) {
        setStreamId(active.id);
        setStreamStatus(active.status);
        setIsStreaming(
          Boolean(active.isActive) || ['STARTING', 'LIVE', 'STOPPING'].includes(active.status),
        );
        pollStatus(active.id);
      }
      setQuota(quotaData);
    }

    restoreRuntime();

    return () => {
      if (statusIntervalRef.current) clearInterval(statusIntervalRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      clearVideoObjectUrl();
    };
  }, [clearVideoObjectUrl, pollStatus]);

  const ensureProject = useCallback(
    async (file: File) => {
      if (projectId) {
        return { id: projectId, title: projectTitle, document };
      }

      const title = createLiveStreamProjectTitle(file.name);
      const session = await createLiveStreamProject(title);
      const nextDocument = createDocumentPatch(document, { title });
      await saveLiveStreamProject(session.id, title, nextDocument);
      setProjectId(session.id);
      setProjectTitle(session.title);
      setDocument(nextDocument);
      return { ...session, document: nextDocument };
    },
    [document, projectId, projectTitle],
  );

  const handleFileSelect = useCallback(
    async (file: File) => {
      setErrorMessage(null);
      try {
        const session = await ensureProject(file);
        const assetId = await uploadLiveStreamSourceAsset(session.id, file);
        const nextDocument = createDocumentPatch(session.document, {
          sourceAssetId: assetId,
          title: session.title,
        });
        setDocument(nextDocument);
        await saveLiveStreamProject(session.id, session.title, nextDocument);

        const nextInfo = await getLiveStreamSourceInfo(session.id);
        setSourceInfo(nextInfo);
        clearVideoObjectUrl();
        const localUrl = URL.createObjectURL(file);
        videoUrlRef.current = localUrl;
        setVideoUrl(localUrl);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal upload source video.';
        setErrorMessage(message);
        logger.error('Live stream source upload failed', error);
      }
    },
    [clearVideoObjectUrl, ensureProject],
  );

  const handleStartStream = useCallback(async () => {
    if (!projectId || !document.sourceAssetId || !streamKey) return;
    setErrorMessage(null);
    setStreamStatus('Starting');

    try {
      const response = await startLiveStreamProject({
        projectId,
        streamKey,
        customRtmpUrl: document.platform === 'custom' ? document.customRtmpUrl : undefined,
      });
      setStreamId(response.streamId);
      setIsStreaming(true);
      setStreamStatus(response.status);
      pollStatus(response.streamId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal memulai live stream.';
      setErrorMessage(message);
      setStreamStatus('Failed');
      setIsStreaming(false);
      logger.error('Stream start failed', error);
    }
  }, [document, pollStatus, projectId, streamKey]);

  const handleStopStream = useCallback(async () => {
    if (!streamId) return;

    try {
      setStreamStatus('Stopping');
      await stopStream(streamId);
      setIsStreaming(false);
      setStreamStatus('Ended');
      if (statusIntervalRef.current) {
        clearInterval(statusIntervalRef.current);
      }
      setQuota(await getStreamQuota().catch(() => null));

      if (projectId) {
        await authFetch(`/api/v1/workspaces/live-stream/${projectId}/complete`, {
          method: 'POST',
        }).catch((err) => {
          logger.warn('Failed to mark live stream workspace as completed', err);
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menghentikan live stream.';
      setErrorMessage(message);
      logger.error('Stream stop failed', error);
    }
  }, [streamId, projectId]);

  const metadata = sourceInfo?.source ?? undefined;
  const durationSeconds = metadataNumberSchema.safeParse(metadata?.durationMs).success
    ? Math.round((metadata?.durationMs ?? 0) / 1000)
    : null;

  return {
    projectId,
    projectTitle,
    document,
    sourceInfo,
    sourceMetadata: metadata,
    durationSeconds,
    isHydrating,
    videoUrl,
    platform: document.platform,
    setPlatform: (platform: StreamPlatform) => updateDocument({ platform }),
    streamKey,
    setStreamKey,
    isStreamKeyVisible,
    setIsStreamKeyVisible,
    customRtmpUrl: document.customRtmpUrl ?? '',
    setCustomRtmpUrl: (customRtmpUrl: string) => updateDocument({ customRtmpUrl }),
    isStreaming,
    streamStatus,
    quality: document.quality,
    setQuality: (quality: '720p' | '1080p') =>
      updateDocument({ quality, bitrateKbps: quality === '1080p' ? 4500 : 2500 }),
    bitrate: document.bitrateKbps,
    setBitrate: (bitrateKbps: number) => updateDocument({ bitrateKbps }),
    duration: document.durationMinutes,
    setDuration: (durationMinutes: number) => updateDocument({ durationMinutes }),
    quota,
    showTopup,
    setShowTopup,
    errorMessage,
    handleFileSelect,
    handleStartStream,
    handleStopStream,
    hasSourceVideo: Boolean(document.sourceAssetId && videoUrl),
  };
}
