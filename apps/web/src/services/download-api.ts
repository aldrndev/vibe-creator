import { api, fetchAuthenticatedBlob } from '@/services/api';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1`;

interface DownloadJobResponse {
  jobId: string;
  status: string;
  platform: string;
}

interface DownloadStatusResponse {
  id: string;
  status: 'PENDING' | 'DOWNLOADING' | 'COMPLETED' | 'FAILED';
  platform: string;
  title?: string;
  sourceUrl?: string;
  errorMessage?: string;
  completedAt?: string;
}

function handleDownloadError(err: unknown): never {
  if (
    err instanceof Error &&
    (err.message.includes('not found') ||
      err.message.includes('NOT_FOUND') ||
      err.message.includes('404'))
  ) {
    throw new Error(
      'Download gagal. Platform ini mungkin tidak didukung atau video tidak tersedia.',
    );
  }
  throw err;
}

/**
 * Download API service for URL-based video downloads
 * Uses main api service for automatic token refresh
 */
export const downloadApi = {
  /**
   * Request video download from URL
   */
  async requestDownload(url: string): Promise<DownloadJobResponse> {
    const response = await api.post<DownloadJobResponse>('/download/request', {
      url,
    });
    if (!response.success) {
      throw new Error(
        'error' in response && response.error?.message
          ? response.error.message
          : 'Download request failed',
      );
    }
    if (!response.data) {
      throw new Error('Download request failed');
    }
    return response.data;
  },

  /**
   * Get download job status
   */
  async getStatus(jobId: string): Promise<DownloadStatusResponse> {
    const response = await api.get<DownloadStatusResponse>(`/download/${jobId}/status`);
    if (!response.success) {
      throw new Error(
        'error' in response && response.error?.message
          ? response.error.message
          : 'Status check failed',
      );
    }
    if (!response.data) {
      throw new Error('Status check failed');
    }
    return response.data;
  },

  /**
   * Get download file URL
   */
  getFileUrl(jobId: string): string {
    return `${API_BASE}/download/${jobId}/file`;
  },

  /**
   * Wait for download completion
   */
  async waitForCompletion(
    jobId: string,
    onProgress?: (status: string) => void,
    pollInterval = 2000,
    timeout = 60000,
  ): Promise<DownloadStatusResponse> {
    const startTime = Date.now();

    while (true) {
      try {
        const status = await this.getStatus(jobId);

        if (onProgress) {
          onProgress(status.status);
        }

        if (status.status === 'COMPLETED') {
          return status;
        }

        if (status.status === 'FAILED') {
          throw new Error(status.errorMessage || 'Download failed');
        }
      } catch (err) {
        handleDownloadError(err);
      }

      if (Date.now() - startTime > timeout) {
        throw new Error('Download timeout. Coba lagi atau gunakan URL dari platform lain.');
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  },

  /**
   * Delete a download job
   */
  async deleteDownload(jobId: string): Promise<void> {
    const response = await api.delete(`/download/${jobId}`);
    if (!response.success) {
      throw new Error(response.error?.message || 'Delete failed');
    }
  },

  /**
   * Fetch file with auth for preview modal
   */
  async fetchFile(jobId: string): Promise<Blob> {
    try {
      return await fetchAuthenticatedBlob(`${API_BASE}/download/${jobId}/file`);
    } catch {
      throw new Error('Gagal mengambil file video');
    }
  },
};
