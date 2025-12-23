import { useAuthStore } from '@/stores/auth-store';

interface UploadResponse {
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
}

interface ExportJobResponse {
  jobId: string;
  status: string;
}

interface ExportStatusResponse {
  id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  errorMessage?: string;
  localPath?: string;
  completedAt?: string;
}

interface TimelineData {
  clips: Array<{
    localPath: string;
    startTime: number;
    endTime: number;
  }>;
  settings: {
    width: number;
    height: number;
    fps: number;
  };
}

interface CreateExportInput {
  projectId: string;
  timelineData: TimelineData;
  format?: 'MP4' | 'WEBM' | 'MOV';
  resolution?: 'SD' | 'HD' | 'UHD';
  addWatermark?: boolean;
}

const API_BASE = '/api/v1';

function getAuthHeader(): string {
  const token = useAuthStore.getState().accessToken;
  return token ? `Bearer ${token}` : '';
}

/**
 * Export API service for server-side video export
 */
export const exportApi = {
  /**
   * Upload video file to server
   */
  async uploadVideo(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload/video`, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(),
      },
      body: formData,
      credentials: 'include',
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
    const response = await fetch(`${API_BASE}/export/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(input),
      credentials: 'include',
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
    const response = await fetch(`${API_BASE}/export/${jobId}/status`, {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(),
      },
      credentials: 'include',
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
    return `/api/v1/export/${jobId}/download`;
  },

  /**
   * Poll for export completion
   */
  async waitForCompletion(
    jobId: string,
    onProgress?: (progress: number) => void,
    pollInterval = 2000,
    timeout = 300000 // 5 minutes
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

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  },
};
