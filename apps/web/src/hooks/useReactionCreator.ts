import { useCallback, useEffect, useRef, useState } from 'react';
import { authFetch, downloadAuthenticatedFile } from '@/services/api';
import { type ExportEvent, exportApi } from '@/services/export-api';
import {
  createDefaultReactionDocument,
  createReactionProject,
  createReactionProjectTitle,
  getReactionSourceInfo,
  loadReactionProject,
  type ReactionCreatorProjectDocument,
  type ReactionSourceInfo,
  saveReactionProject,
  uploadReactionVideoAsset,
} from '@/services/reaction-creator-project-api';

export type ReactionRenderPhase = 'idle' | 'queued' | 'rendering' | 'ready' | 'failed';
export type ReactionRecordingPhase =
  | 'idle'
  | 'requesting'
  | 'countdown'
  | 'recording'
  | 'ready'
  | 'saving'
  | 'failed';
export type LayoutMode = 'pip' | 'side-by-side';
export type SideBySideLayout = ReactionCreatorProjectDocument['layout']['splitOrientation'];
export type PipPosition = ReactionCreatorProjectDocument['layout']['pipPosition'];

export interface ReactionRenderResult {
  readonly jobId: string;
  readonly filename: string;
  readonly previewUrl: string;
  readonly urlExpiresAt?: string;
}

const MAX_SOURCE_SIZE_BYTES = 300 * 1024 * 1024;
const MAX_DURATION_SECONDS = 20 * 60;
const MAX_RECORDING_DURATION_MS = MAX_DURATION_SECONDS * 1000;

interface PendingReactionRecording {
  readonly file: File;
  readonly previewUrl: string;
  readonly durationMs: number;
}

function createRecorderMimeType(): string | undefined {
  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

async function validateVideoFile(file: File): Promise<void> {
  if (!file.type.startsWith('video/')) {
    throw new Error('Pilih file video.');
  }
  if (file.size > MAX_SOURCE_SIZE_BYTES) {
    throw new Error('File terlalu besar. Maksimal 300 MB.');
  }

  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Metadata video gagal dibaca.'));
    });
    if (video.duration > MAX_DURATION_SECONDS) {
      throw new Error('Durasi video terlalu panjang untuk Reaction Creator.');
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getReactionRenderErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Render reaction gagal.';

  if (
    message.includes('Invalid input data') ||
    message.includes('Unknown error') ||
    message.includes('Render failed')
  ) {
    return 'Render reaction gagal diproses. Coba lagi atau cek video yang digunakan.';
  }

  return message;
}

export function useReactionCreator(sessionId?: string) {
  const [projectId, setProjectId] = useState<string | undefined>(sessionId);
  const [title, setTitle] = useState('Reaction Baru');
  const [document, setDocument] = useState<ReactionCreatorProjectDocument>(
    createDefaultReactionDocument,
  );
  const [sourceInfo, setSourceInfo] = useState<ReactionSourceInfo | undefined>();
  const [mainVideoUrl, setMainVideoUrl] = useState('');
  const [reactionVideoUrl, setReactionVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recordingPhase, setRecordingPhase] = useState<ReactionRecordingPhase>('idle');
  const [recordingCountdown, setRecordingCountdown] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [pendingRecording, setPendingRecording] = useState<PendingReactionRecording | null>(null);
  const [renderOpen, setRenderOpen] = useState(false);
  const [renderPhase, setRenderPhase] = useState<ReactionRenderPhase>('idle');
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderNotice, setRenderNotice] = useState<string | null>(null);
  const [renderResult, setRenderResult] = useState<ReactionRenderResult | null>(null);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const reactionInputRef = useRef<HTMLInputElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const mainVideoUrlRef = useRef<string | null>(null);
  const reactionVideoUrlRef = useRef<string | null>(null);
  const pendingRecordingUrlRef = useRef<string | null>(null);
  const resultUrlRef = useRef<string | null>(null);
  const stopEventsRef = useRef<(() => void) | null>(null);
  const saveReadyRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const recordingCleanupRef = useRef<(() => void) | null>(null);

  const replaceMainVideoUrl = useCallback((url?: string) => {
    if (mainVideoUrlRef.current?.startsWith('blob:')) URL.revokeObjectURL(mainVideoUrlRef.current);
    mainVideoUrlRef.current = url ?? null;
    setMainVideoUrl(url ?? '');
  }, []);

  const replaceReactionVideoUrl = useCallback((url?: string) => {
    if (reactionVideoUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(reactionVideoUrlRef.current);
    }
    reactionVideoUrlRef.current = url ?? null;
    setReactionVideoUrl(url ?? '');
  }, []);

  const clearPendingRecording = useCallback(() => {
    if (pendingRecordingUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingRecordingUrlRef.current);
    }
    pendingRecordingUrlRef.current = null;
    setPendingRecording(null);
  }, []);

  const stopCameraStream = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });
    cameraStreamRef.current = null;
    setCameraStream(null);
  }, []);

  const clearRecordingTimeout = useCallback(() => {
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  }, []);

  const clearRecordingRuntime = useCallback(() => {
    clearRecordingTimeout();
    recordingCleanupRef.current?.();
    recordingCleanupRef.current = null;
    recordingStartedAtRef.current = null;
  }, [clearRecordingTimeout]);

  const resetRender = useCallback(() => {
    stopEventsRef.current?.();
    stopEventsRef.current = null;
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = null;
    setRenderResult(null);
    setRenderPhase('idle');
    setRenderProgress(0);
    setRenderError(null);
    setRenderNotice(null);
  }, []);

  useEffect(() => {
    return () => {
      stopEventsRef.current?.();
      stopCameraStream();
      clearRecordingRuntime();
      clearPendingRecording();
      if (mainVideoUrlRef.current?.startsWith('blob:'))
        URL.revokeObjectURL(mainVideoUrlRef.current);
      if (reactionVideoUrlRef.current?.startsWith('blob:')) {
        URL.revokeObjectURL(reactionVideoUrlRef.current);
      }
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, [clearPendingRecording, clearRecordingRuntime, stopCameraStream]);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      saveReadyRef.current = true;
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    saveReadyRef.current = false;
    loadReactionProject(sessionId)
      .then((session) => {
        if (cancelled) return;
        setProjectId(session.id);
        setTitle(session.title);
        setDocument(session.document);
        setSourceInfo(session.sourceInfo);
        replaceMainVideoUrl(session.mainVideoUrl);
        replaceReactionVideoUrl(session.reactionVideoUrl);
        saveReadyRef.current = true;
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : 'Gagal memuat draft reaction.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [replaceMainVideoUrl, replaceReactionVideoUrl, sessionId]);

  useEffect(() => {
    if (!projectId || !saveReadyRef.current) return;
    const timeout = window.setTimeout(() => {
      setIsSaving(true);
      saveReactionProject(projectId, title, document)
        .catch((error: unknown) => {
          setMessage(error instanceof Error ? error.message : 'Autosave reaction gagal.');
        })
        .finally(() => setIsSaving(false));
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [document, projectId, title]);

  const updateDocument = useCallback(
    (next: ReactionCreatorProjectDocument) => {
      setDocument({ ...next, savedAt: new Date().toISOString() });
      resetRender();
    },
    [resetRender],
  );

  const refreshSourceInfo = useCallback(async (nextProjectId: string) => {
    const nextSource = await getReactionSourceInfo(nextProjectId);
    setSourceInfo(nextSource);
    return nextSource;
  }, []);

  const selectMainVideo = useCallback(
    async (file: File) => {
      setMessage(null);
      setIsSaving(true);
      resetRender();
      try {
        await validateVideoFile(file);
        const session = projectId
          ? { id: projectId, title }
          : await createReactionProject(createReactionProjectTitle(file.name));
        const nextTitle = projectId ? title : session.title;
        const assetId = await uploadReactionVideoAsset(session.id, file, 'media');
        const nextDocument: ReactionCreatorProjectDocument = {
          ...createDefaultReactionDocument(),
          mainAssetId: assetId,
        };
        await saveReactionProject(session.id, nextTitle, nextDocument);
        setProjectId(session.id);
        setTitle(nextTitle);
        setDocument(nextDocument);
        replaceMainVideoUrl(URL.createObjectURL(file));
        replaceReactionVideoUrl();
        await refreshSourceInfo(session.id);
        saveReadyRef.current = true;
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Upload video utama gagal.');
      } finally {
        setIsSaving(false);
      }
    },
    [
      projectId,
      refreshSourceInfo,
      replaceMainVideoUrl,
      replaceReactionVideoUrl,
      resetRender,
      title,
    ],
  );

  const selectReactionVideo = useCallback(
    async (file: File, inputMode: 'recorded' | 'uploaded') => {
      if (!projectId) {
        setMessage('Upload video utama sebelum menambahkan reaction.');
        return;
      }

      setMessage(null);
      setIsSaving(true);
      resetRender();
      try {
        if (inputMode === 'uploaded') {
          await validateVideoFile(file);
        } else if (!file.type.startsWith('video/')) {
          throw new Error('Recording tidak menghasilkan file video.');
        } else if (file.size > MAX_SOURCE_SIZE_BYTES) {
          throw new Error('Recording terlalu besar. Coba rekam durasi yang lebih pendek.');
        }
        const assetId = await uploadReactionVideoAsset(projectId, file, 'reaction');
        const nextDocument: ReactionCreatorProjectDocument = {
          ...document,
          reactionAssetId: assetId,
          reactionInputMode: inputMode,
          savedAt: new Date().toISOString(),
        };
        await saveReactionProject(projectId, title, nextDocument);
        setDocument(nextDocument);
        replaceReactionVideoUrl(URL.createObjectURL(file));
        clearPendingRecording();
        setRecordingPhase('idle');
        await refreshSourceInfo(projectId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Video reaction gagal disimpan.');
      } finally {
        setIsSaving(false);
      }
    },
    [
      clearPendingRecording,
      document,
      projectId,
      refreshSourceInfo,
      replaceReactionVideoUrl,
      resetRender,
      title,
    ],
  );

  const stopRecording = useCallback(() => {
    mainVideoRef.current?.pause();
    clearRecordingTimeout();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, [clearRecordingTimeout]);

  const startRecording = useCallback(async () => {
    if (!projectId || !mainVideoUrl) {
      setRecordingError('Upload video utama dulu sebelum record reaction.');
      return;
    }
    if (!('MediaRecorder' in window) || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError('Browser ini belum mendukung record camera.');
      setRecordingPhase('failed');
      return;
    }

    setRecordingError(null);
    setRecordingPhase('requesting');
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setMessage('Mic tidak tersedia, recording dilanjutkan tanpa audio reaction.');
      }

      cameraStreamRef.current = stream;
      setCameraStream(stream);
      clearPendingRecording();
      setRecordingPhase('countdown');
      setRecordingCountdown(3);

      for (let count = 3; count > 0; count -= 1) {
        setRecordingCountdown(count);
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
      }

      chunksRef.current = [];
      const mimeType = createRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void (async () => {
          setRecordingPhase('saving');
          try {
            const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
            if (blob.size === 0) {
              throw new Error('Recording kosong. Coba record ulang.');
            }
            if (blob.size > MAX_SOURCE_SIZE_BYTES) {
              throw new Error('Recording terlalu besar. Coba rekam durasi yang lebih pendek.');
            }
            const recordedDurationMs = Math.max(
              1,
              Date.now() - (recordingStartedAtRef.current ?? Date.now()),
            );
            const file = new File([blob], `reaction-recording-${Date.now()}.webm`, {
              type: blob.type,
            });
            const previewUrl = URL.createObjectURL(blob);
            pendingRecordingUrlRef.current = previewUrl;
            setPendingRecording({ file, previewUrl, durationMs: recordedDurationMs });
            setRecordingPhase('ready');
          } catch (error) {
            setRecordingError(error instanceof Error ? error.message : 'Recording gagal disimpan.');
            setRecordingPhase('failed');
          } finally {
            clearRecordingRuntime();
            stopCameraStream();
          }
        })();
      };

      const mainVideo = mainVideoRef.current;
      if (mainVideo) {
        mainVideo.currentTime = 0;
        const stopOnEnded = () => stopRecording();
        mainVideo.addEventListener('ended', stopOnEnded, { once: true });
        recordingCleanupRef.current = () => {
          mainVideo.removeEventListener('ended', stopOnEnded);
        };
        await mainVideo.play().catch(() => undefined);
      }
      recorder.start(250);
      recordingStartedAtRef.current = Date.now();
      const maxDurationMs = Math.min(
        sourceInfo?.main?.durationMs ?? MAX_RECORDING_DURATION_MS,
        MAX_RECORDING_DURATION_MS,
      );
      recordingTimeoutRef.current = window.setTimeout(() => {
        stopRecording();
      }, maxDurationMs);
      setRecordingPhase('recording');
    } catch (error) {
      setRecordingError(
        error instanceof Error ? error.message : 'Camera atau microphone tidak bisa digunakan.',
      );
      setRecordingPhase('failed');
      stopCameraStream();
    }
  }, [
    clearPendingRecording,
    clearRecordingRuntime,
    mainVideoUrl,
    projectId,
    sourceInfo?.main?.durationMs,
    stopCameraStream,
    stopRecording,
  ]);

  const acceptRecording = useCallback(async () => {
    if (!pendingRecording) {
      setRecordingError('Tidak ada recording yang siap digunakan.');
      setRecordingPhase('failed');
      return;
    }

    await selectReactionVideo(pendingRecording.file, 'recorded');
  }, [pendingRecording, selectReactionVideo]);

  const discardRecording = useCallback(() => {
    clearPendingRecording();
    setRecordingError(null);
    setRecordingPhase('idle');
  }, [clearPendingRecording]);

  const startNew = useCallback(() => {
    saveReadyRef.current = false;
    setProjectId(undefined);
    setTitle('Reaction Baru');
    setSourceInfo(undefined);
    replaceMainVideoUrl();
    replaceReactionVideoUrl();
    clearPendingRecording();
    setDocument(createDefaultReactionDocument());
    resetRender();
    setMessage(null);
    setRecordingError(null);
    setRecordingPhase('idle');
    saveReadyRef.current = true;
  }, [clearPendingRecording, replaceMainVideoUrl, replaceReactionVideoUrl, resetRender]);

  const loadPreviewBlob = useCallback(async (jobId: string, filename: string, expiry?: string) => {
    const response = await authFetch(exportApi.getDownloadUrl(jobId));
    if (!response.ok) throw new Error('Gagal mengambil hasil export.');
    const url = URL.createObjectURL(await response.blob());
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    resultUrlRef.current = url;
    setRenderResult({ jobId, filename, previewUrl: url, urlExpiresAt: expiry });
    setRenderPhase('ready');
    setRenderProgress(100);
  }, []);

  const renderReaction = useCallback(async () => {
    if (!projectId || !document.mainAssetId || !document.reactionAssetId) {
      setMessage('Upload video utama dan record/upload reaction sebelum render.');
      return;
    }

    resetRender();
    setRenderOpen(true);
    setRenderPhase('queued');
    setRenderProgress(0);
    setRenderError(null);
    setRenderNotice(null);

    try {
      await saveReactionProject(projectId, title, document);
      const job = await exportApi.createReactionRenderJob(projectId);
      if (job.reused && job.cacheState === 'completed-result' && job.filename) {
        setRenderNotice('Menggunakan hasil render terakhir karena project belum berubah.');
      }
      if (job.status === 'COMPLETED' && job.filename) {
        await loadPreviewBlob(job.jobId, job.filename, job.urlExpiresAt);
        return;
      }

      setRenderPhase(job.status === 'QUEUED' ? 'queued' : 'rendering');
      setRenderProgress(job.progress);

      const fail = (messageText: string) => {
        setRenderPhase('failed');
        setRenderError(getReactionRenderErrorMessage(messageText));
      };
      const handleEvent = (event: ExportEvent) => {
        if (event.type === 'snapshot' || event.type === 'progress') {
          setRenderPhase(event.status === 'QUEUED' ? 'queued' : 'rendering');
          setRenderProgress(event.progress);
        }
        if (event.type === 'completed') {
          stopEventsRef.current?.();
          stopEventsRef.current = null;
          void loadPreviewBlob(event.jobId, event.filename, event.urlExpiresAt).catch(() =>
            fail('Hasil render sudah siap, tapi preview belum dapat dimuat.'),
          );
        }
        if (event.type === 'failed' || event.type === 'expired') {
          fail(event.errorMessage);
        }
      };

      stopEventsRef.current = exportApi.subscribeToExportEvents(job.jobId, {
        onEvent: handleEvent,
        onError: () => {
          stopEventsRef.current = null;
          void exportApi
            .waitForCompletion(job.jobId, (progress) =>
              setRenderProgress(Math.round(progress * 100)),
            )
            .then((status) =>
              loadPreviewBlob(
                job.jobId,
                status.filename ?? job.filename ?? 'reaction.mp4',
                status.urlExpiresAt ?? job.urlExpiresAt,
              ),
            )
            .catch((error: unknown) => fail(getReactionRenderErrorMessage(error)));
        },
      });
    } catch (error) {
      setRenderPhase('failed');
      setRenderError(getReactionRenderErrorMessage(error));
    }
  }, [document, loadPreviewBlob, projectId, resetRender, title]);

  const downloadResult = useCallback(() => {
    if (!renderResult) return;
    void downloadAuthenticatedFile(
      exportApi.getDownloadUrl(renderResult.jobId),
      renderResult.filename,
    );
  }, [renderResult]);

  return {
    state: {
      projectId,
      title,
      document,
      sourceInfo,
      mainVideoUrl,
      reactionVideoUrl,
      isLoading,
      isSaving,
      message,
      recordingPhase,
      recordingCountdown,
      recordingError,
      cameraStream,
      pendingRecording,
      renderOpen,
      renderPhase,
      renderProgress,
      renderError,
      renderNotice,
      renderResult,
      hasMainVideo: Boolean(document.mainAssetId && mainVideoUrl),
      hasReactionVideo: Boolean(document.reactionAssetId && reactionVideoUrl),
    },
    refs: {
      mainInputRef,
      reactionInputRef,
      mainVideoRef,
    },
    actions: {
      setTitle,
      updateDocument,
      selectMainVideo,
      selectReactionVideo,
      startRecording,
      stopRecording,
      acceptRecording,
      discardRecording,
      startNew,
      renderReaction,
      downloadResult,
      setRenderOpen,
      setMessage,
    },
  };
}
