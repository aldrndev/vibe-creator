import { authFetch } from '@/services/api';

interface UploadResponse {
  filename: string;
  uploadToken: string;
  mimetype: string;
  size: number;
  mediaType: 'video' | 'image' | 'audio';
}

export type ExportCacheState = 'none' | 'active-job' | 'completed-result';

export interface ExportJobResponse {
  jobId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  reused: boolean;
  cacheState: ExportCacheState;
  downloadUrl?: string;
  filename?: string;
  urlExpiresAt?: string;
}

export interface ExportStatusResponse {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  phase: string;
  errorMessage?: string;
  downloadUrl?: string;
  filename?: string;
  urlExpiresAt?: string;
  completedAt?: string;
  cacheState?: ExportCacheState;
}

export type ExportEvent =
  | { type: 'snapshot'; jobId: string; status: string; progress: number; phase: string }
  | {
      type: 'progress';
      jobId: string;
      status: string;
      progress: number;
      phase: string;
      message: string;
    }
  | {
      type: 'completed';
      jobId: string;
      progress: 100;
      downloadUrl: string;
      filename: string;
      completedAt: string;
      urlExpiresAt: string;
    }
  | { type: 'failed'; jobId: string; errorMessage: string }
  | { type: 'expired'; jobId: string; errorMessage: string };

interface TimelineData {
  clips: Array<{
    localPath: string;
    mediaType?: 'video' | 'image';
    startTime: number;
    endTime: number;
    transforms?: {
      x: number;
      y: number;
      scale: number;
      rotation: number;
      opacity: number;
    };
    effects?: {
      filters: string[];
      speed: number;
      volume: number;
      fadeIn: number;
      fadeOut: number;
      transitionIn?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';
      transitionOut?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'zoom';
      motion?: 'none' | 'zoom-in' | 'zoom-out';
    };
  }>;
  textOverlays?: Array<{
    id: string;
    content: string;
    startMs: number;
    endMs: number;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fontWeight?: string;
    color: string;
    backgroundColor?: string;
    animation?: 'none' | 'fade' | 'slide-up' | 'slide-down' | 'typewriter';
    animationIn?: string;
    animationOut?: string;
    animationLoop?: string;
  }>;
  audioTracks?: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
    timelineStartMs: number;
    timelineEndMs: number;
    volume: number;
    fadeInMs: number;
    fadeOutMs: number;
  }>;
  settings: {
    width: number;
    height: number;
    fps: number;
    backgroundColor?: string;
    backgroundMode?: 'solid' | 'blur';
    backgroundBlurAmount?: number;
    backgroundBlurZoom?: number;
    backgroundDim?: number;
    backgroundSaturation?: number;
  };
}

interface CreateExportInput {
  projectId: string;
  timelineData: TimelineData;
  format?: 'MP4' | 'WEBM' | 'MOV';
  resolution?: 'SD' | 'HD' | 'UHD';
  addWatermark?: boolean;
}

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1`;
const POLLING_FAST_MS = 1000;
const POLLING_MEDIUM_MS = 2000;
const POLLING_SLOW_MS = 5000;
const ONE_MINUTE_MS = 60_000;
const THREE_MINUTES_MS = 180_000;

/**
 * Export API service for server-side video export
 * Uses authFetch for automatic token refresh
 */
export const exportApi = {
  /**
   * Upload video file to server
   */
  async uploadVideo(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authFetch(`${API_BASE}/upload/video`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Upload failed');
    }
    return data.data;
  },

  /**
   * Upload media file to server-side export temp storage.
   */
  async uploadMedia(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authFetch(`${API_BASE}/upload/media`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Upload failed');
    }
    return data.data;
  },

  /**
   * Create export job
   */
  async createExportJob(input: CreateExportInput): Promise<ExportJobResponse> {
    const response = await authFetch(`${API_BASE}/export/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Create export failed');
    }
    return data.data;
  },

  /**
   * Get export job status
   */
  async getExportStatus(jobId: string): Promise<ExportStatusResponse> {
    const response = await authFetch(`${API_BASE}/export/${jobId}/status`, {
      method: 'GET',
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Status check failed');
    }
    return data.data;
  },

  /**
   * Download exported video
   */
  getDownloadUrl(jobId: string): string {
    return `${API_BASE}/export/${jobId}/download`;
  },

  /**
   * Create an EventSource subscription for realtime export progress.
   */
  subscribeToExportEvents(
    jobId: string,
    handlers: {
      onEvent: (event: ExportEvent) => void;
      onError: (error: Event) => void;
    },
  ): () => void {
    const source = new EventSource(`${API_BASE}/export/${jobId}/events`, {
      withCredentials: true,
    });

    source.onmessage = (message) => {
      handlers.onEvent(JSON.parse(message.data) as ExportEvent);
    };
    source.onerror = (error) => {
      handlers.onError(error);
      source.close();
    };

    return () => source.close();
  },

  /**
   * Cancel an export job
   */
  async cancelExportJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const response = await authFetch(`${API_BASE}/export/${jobId}/cancel`, {
      method: 'POST',
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Cancel failed');
    }
    return data.data;
  },

  /**
   * Poll for export completion
   */
  async waitForCompletion(
    jobId: string,
    onProgress?: (progress: number) => void,
    timeout = 300000, // 5 minutes
  ): Promise<ExportStatusResponse> {
    const startTime = Date.now();

    while (true) {
      const status = await this.getExportStatus(jobId);

      if (onProgress) {
        onProgress(status.progress / 100);
      }

      if (status.status === 'COMPLETED') {
        return status;
      }

      if (status.status === 'FAILED') {
        throw new Error(status.errorMessage || 'Export failed');
      }

      if (Date.now() - startTime > timeout) {
        throw new Error('Export timeout');
      }

      await new Promise((resolve) =>
        setTimeout(resolve, getAdaptivePollInterval(Date.now() - startTime)),
      );
    }
  },
};

function getAdaptivePollInterval(elapsedMs: number): number {
  if (elapsedMs < ONE_MINUTE_MS) {
    return POLLING_FAST_MS;
  }

  if (elapsedMs < THREE_MINUTES_MS) {
    return POLLING_MEDIUM_MS;
  }

  return POLLING_SLOW_MS;
}
