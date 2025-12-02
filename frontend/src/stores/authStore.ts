import { create } from 'zustand';
import type { User, AuthResponse, RegisterRequest, LoginRequest } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  setTokens: (response: AuthResponse) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const initialAccessToken = localStorage.getItem('access_token');
  const initialRefreshToken = localStorage.getItem('refresh_token');
  const initialIsAuthenticated = !!initialAccessToken;

  console.log('Auth Store Initialized:', {
    hasAccessToken: !!initialAccessToken,
    hasRefreshToken: !!initialRefreshToken,
    isAuthenticated: initialIsAuthenticated
  });

  return {
    user: null,
    accessToken: initialAccessToken,
    refreshToken: initialRefreshToken,
    isAuthenticated: initialIsAuthenticated,
    isLoading: false,
    error: null,

    login: async (credentials) => {
      console.log('Login attempt:', credentials.email);
      set({ isLoading: true, error: null });
      try {
        const response = await api.login(credentials);
        console.log('Login successful, setting tokens');

        localStorage.setItem('access_token', response.tokens.access_token);
        localStorage.setItem('refresh_token', response.tokens.refresh_token);

        set({
          user: response.user,
          accessToken: response.tokens.access_token,
          refreshToken: response.tokens.refresh_token,
          isAuthenticated: true,
          isLoading: false,
        });

        console.log('Auth state updated:', {
          user: response.user.email,
          isAuthenticated: true
        });
      } catch (error: any) {
        console.error('Login failed:', error);
        set({
          error: error.response?.data?.message || 'Login failed',
          isLoading: false,
        });
        throw error;
      }
    },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.register(data);
      set({
        user: response.user,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
      localStorage.setItem('access_token', response.tokens.access_token);
      localStorage.setItem('refresh_token', response.tokens.refresh_token);
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      });
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  },

  googleLogin: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.verifyGoogleToken(idToken);
      set({
        user: response.user,
        accessToken: response.tokens.access_token,
        refreshToken: response.tokens.refresh_token,
        isAuthenticated: true,
        isLoading: false,
      });
      localStorage.setItem('access_token', response.tokens.access_token);
      localStorage.setItem('refresh_token', response.tokens.refresh_token);
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Google login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  setTokens: (response) => {
    set({
      user: response.user,
      accessToken: response.tokens.access_token,
      refreshToken: response.tokens.refresh_token,
      isAuthenticated: true,
    });
    localStorage.setItem('access_token', response.tokens.access_token);
    localStorage.setItem('refresh_token', response.tokens.refresh_token);
  },

  clearError: () => set({ error: null }),
  };
});
