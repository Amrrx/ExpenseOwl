import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../types';

const USER_KEY = 'user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  googleLogin: (idToken: string) => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,

  initialize: async () => {
    try {
      const token = await api.getAccessToken();
      const userJson = await AsyncStorage.getItem(USER_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        set({ user, isAuthenticated: true, isInitialized: true });
      } else {
        set({ isInitialized: true });
      }
    } catch {
      set({ isInitialized: true });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(credentials);
      await api.setTokens(response.tokens.access_token, response.tokens.refresh_token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.register(data);
      await api.setTokens(response.tokens.access_token, response.tokens.refresh_token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } finally {
      await AsyncStorage.removeItem(USER_KEY);
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  googleLogin: async (idToken) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.verifyGoogleToken(idToken);
      await api.setTokens(response.tokens.access_token, response.tokens.refresh_token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Google login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));

// Set up unauthorized handler
api.setOnUnauthorized(() => {
  useAuthStore.getState().logout();
});
