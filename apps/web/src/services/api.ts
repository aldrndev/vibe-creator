import type { ApiResponse } from '@vibe-creator/shared';
import { useAuthStore } from '@/stores/auth-store';

/** API host (without /api/v1) */
export const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const API_BASE_URL = `${API_HOST}/api/v1`;

/**
 * Helper to convert relative API paths to absolute URLs.
 * Use this for public API URLs.
 */
export function getApiUrl(path: string): string {
  if (path.startsWith('/api/v1')) {
    return `${API_HOST}${path}`;
  }
  return path;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const accessToken = useAuthStore.getState().accessToken;
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    return headers;
  }

  private async waitForRefresh(): Promise<void> {
    if (this.refreshPromise) {
      await this.refreshPromise;
    }
  }

  private async handleResponse<T>(
    response: Response,
    endpoint: string,
    method: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    const data = await response.json();

    // Handle 429 Too Many Requests
    if (response.status === 429) {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: data.message || 'Terlalu banyak permintaan. Mohon tunggu sebentar.',
        },
      };
    }

    // Handle standard Fastify errors that might not be in ApiResponse format
    if (!data.success && !data.error && data.message) {
      return {
        success: false,
        error: {
          code: data.error || 'UNKNOWN_ERROR',
          message: data.message,
        },
      };
    }

    // Handle token expiration - auto refresh
    if (response.status === 401 && data.error?.code !== 'INVALID_CREDENTIALS') {
      return this.handleUnauthorized(data, endpoint, method, body);
    }

    // Handle session invalidation (logged in from another device)
    if (response.status === 401 && data.error?.code === 'SESSION_INVALIDATED') {
      await useAuthStore.getState().logout();
    }

    return data;
  }

  private async handleUnauthorized<T>(
    data: ApiResponse<T>,
    endpoint: string,
    method: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    if (endpoint.startsWith('/auth/')) {
      return data;
    }

    const currentToken = useAuthStore.getState().accessToken;
    if (!currentToken) {
      return data;
    }

    if (this.isRefreshing) {
      await this.waitForRefresh();
      const newToken = useAuthStore.getState().accessToken;
      if (!newToken) {
        return data;
      }
      return this.retryRequest<T>(endpoint, method, body);
    }

    return this.refreshAndRetry<T>(data, endpoint, method, body);
  }

  private async refreshAndRetry<T>(
    data: ApiResponse<T>,
    endpoint: string,
    method: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    this.isRefreshing = true;
    this.refreshPromise = useAuthStore.getState().refreshAccessToken();

    try {
      const refreshed = await this.refreshPromise;
      this.isRefreshing = false;
      this.refreshPromise = null;

      if (!refreshed) {
        return data;
      }
      return this.retryRequest<T>(endpoint, method, body);
    } catch {
      this.isRefreshing = false;
      this.refreshPromise = null;
      return data;
    }
  }

  private async retryRequest<T>(
    endpoint: string,
    method: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
    return this.handleResponse<T>(retryResponse, endpoint, method, body);
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<T>(response, endpoint, 'GET');
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
    return this.handleResponse<T>(response, endpoint, 'POST', body);
  }

  async patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      credentials: 'include',
    });
    return this.handleResponse<T>(response, endpoint, 'PATCH', body);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<T>(response, endpoint, 'DELETE');
  }
}

export const api = new ApiClient(API_BASE_URL);

/**
 * Helper for raw fetch with automatic token refresh
 * Use this when you need raw Response (e.g., for blobs, FormData uploads)
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().accessToken;

  // Convert relative /api/v1 paths to absolute URLs
  const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const fullUrl = url.startsWith('/api/v1') ? `${API_HOST}${url}` : url;

  const headers = new Headers(options.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 - try refresh token
  if (response.status === 401) {
    const refreshed = await useAuthStore.getState().refreshAccessToken();
    if (refreshed) {
      const newToken = useAuthStore.getState().accessToken;
      const retryHeaders = new Headers(options.headers);
      if (newToken) {
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
      }

      return fetch(fullUrl, {
        ...options,
        headers: retryHeaders,
        credentials: 'include',
      });
    }
  }

  return response;
}

export async function fetchAuthenticatedBlob(
  url: string,
  options: RequestInit = {},
): Promise<Blob> {
  const response = await authFetch(url, options);
  if (!response.ok) {
    throw new Error(`Authenticated request failed: ${response.status}`);
  }
  return response.blob();
}

export async function downloadAuthenticatedFile(url: string, filename: string): Promise<void> {
  const blob = await fetchAuthenticatedBlob(url);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
