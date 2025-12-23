import { useAuthStore } from '@/stores/auth-store';

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
  localPath?: string;
  errorMessage?: string;
  completedAt?: string;
}

const API_BASE = '/api/v1';

function getAuthHeader(): string {
  const token = useAuthStore.getState().accessToken;
  return token ? `Bearer ${token}` : '';
}

/**
 * Download API service for URL-based video downloads
 */
export const downloadApi = {
  /**
   * Request video download from URL
   */
  async requestDownload(url: string): Promise<DownloadJobResponse> {
    const response = await fetch(`${API_BASE}/download/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({ url }),
      credentials: 'include',
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Download request failed');
    }
    return data.data;
  },

  /**
   * Get download job status
   */
  async getStatus(jobId: string): Promise<DownloadStatusResponse> {
    const response = await fetch(`${API_BASE}/download/${jobId}/status`, {
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
    timeout = 300000
  ): Promise<DownloadStatusResponse> {
    const startTime = Date.now();

    while (true) {
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

      if (Date.now() - startTime > timeout) {
        throw new Error('Download timeout');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  },
};
