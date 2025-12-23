import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
}

interface Subscription {
  tier: 'FREE' | 'CREATOR' | 'PRO';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  exportsUsed: number;
  exportsLimit: number;
  validUntil: Date | null;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  expiresAt: string;
}

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setAuth: (data: AuthResponse) => void;
  setUser: (user: User, subscription: Subscription | null) => void;
  setAccessToken: (accessToken: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

const API_BASE_URL = '/api/v1';

/**
 * Auth store with memory-only access token (no persist)
 * Refresh token is stored in HttpOnly cookie by server
 */
export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  subscription: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (data) => {
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setUser: (user, subscription) => {
    set({
      user,
      subscription,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  setAccessToken: (accessToken) => {
    set({ accessToken });
  },

  logout: async () => {
    const { accessToken } = get();
    
    if (accessToken) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          credentials: 'include',
        });
      } catch {
        // Ignore logout errors
      }
    }
    
    set({
      user: null,
      subscription: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  refreshAccessToken: async () => {
    try {
      // Refresh token is sent automatically via HttpOnly cookie
      // No body needed - cookie contains the refresh token
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          set({
            user: data.data.user,
            accessToken: data.data.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        }
      }
      
      // Refresh failed - silently set unauthenticated
      set({
        user: null,
        subscription: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    } catch {
      set({
        user: null,
        subscription: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    }
  },

  checkAuth: async () => {
    const { accessToken, refreshAccessToken } = get();
    
    // No access token in memory - try to refresh from cookie
    // This will silently fail if no cookie exists
    if (!accessToken) {
      await refreshAccessToken();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.success) {
        set({
          user: data.data.user,
          subscription: data.data.subscription,
          isAuthenticated: true,
          isLoading: false,
        });
      } else if (response.status === 401) {
        // Token expired, try refresh
        await refreshAccessToken();
      } else {
        set({
          user: null,
          subscription: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch {
      // Try refresh on network error
      await refreshAccessToken();
    }
  },
}));
