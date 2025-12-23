import type { ApiResponse } from '@vibe-creator/shared';
import { useAuthStore } from '@/stores/auth-store';

const API_BASE_URL = '/api/v1';

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
      headers['Authorization'] = `Bearer ${accessToken}`;
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
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const data = await response.json();

    // Handle token expiration - auto refresh
    if (response.status === 401 && data.error?.code !== 'INVALID_CREDENTIALS') {
      // Don't refresh for auth endpoints
      if (endpoint.startsWith('/auth/')) {
        return data;
      }

      // Don't try to refresh if user was never logged in (no accessToken)
      const currentToken = useAuthStore.getState().accessToken;
      if (!currentToken) {
        // User is not logged in, just return the 401 response
        return data;
      }

      // Try to refresh token
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        this.refreshPromise = useAuthStore.getState().refreshAccessToken();
        
        try {
          const refreshed = await this.refreshPromise;
          this.isRefreshing = false;
          this.refreshPromise = null;

          if (refreshed) {
            // Retry the original request with new token
            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
              method,
              headers: this.getHeaders(),
              body: body ? JSON.stringify(body) : undefined,
              credentials: 'include',
            });
            return this.handleResponse<T>(retryResponse, endpoint, method, body);
          } else {
            // Refresh failed, logout
            await useAuthStore.getState().logout();
          }
        } catch {
          this.isRefreshing = false;
          this.refreshPromise = null;
          await useAuthStore.getState().logout();
        }
      } else {
        // Wait for ongoing refresh
        await this.waitForRefresh();
        
        // Retry with potentially new token
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: this.getHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include',
        });
        return this.handleResponse<T>(retryResponse, endpoint, method, body);
      }
    }

    // Handle session invalidation (logged in from another device)
    if (response.status === 401 && data.error?.code === 'SESSION_INVALIDATED') {
      await useAuthStore.getState().logout();
    }

    return data;
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
