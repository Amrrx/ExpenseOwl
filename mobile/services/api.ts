import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  Expense,
  RecurringExpense,
  Config,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  AIConfig,
} from '../types';

// API URL from app.config.js extra config
// Set via: EXPO_PUBLIC_API_URL=https://your-api.com npx expo run:android
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.19:8080';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

class ApiService {
  private client: ReturnType<typeof axios.create>;
  private onUnauthorized?: () => void;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorized = callback;
  }

  private async setupInterceptors() {
    this.client.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
              refresh_token: refreshToken,
            });

            const { access_token, refresh_token: newRefreshToken } = response.data;
            await SecureStore.setItemAsync(TOKEN_KEY, access_token);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.client(originalRequest);
          } catch {
            await this.clearTokens();
            this.onUnauthorized?.();
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  }

  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }

  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  // Auth
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/register', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/login', data);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/api/auth/logout');
    } finally {
      await this.clearTokens();
    }
  }

  async verifyGoogleToken(idToken: string): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/google/verify', {
      id_token: idToken,
    });
    return response.data;
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    const response = await this.client.get('/api/expenses');
    return response.data;
  }

  async addExpense(expense: Omit<Expense, 'id' | 'created_at' | 'updated_at'>): Promise<Expense> {
    const response = await this.client.put('/api/expense', expense);
    return response.data;
  }

  async updateExpense(id: string, expense: Partial<Expense>): Promise<Expense> {
    const response = await this.client.put(`/api/expense/edit?id=${id}`, expense);
    return response.data;
  }

  async deleteExpense(id: string): Promise<void> {
    await this.client.delete(`/api/expense/delete?id=${id}`);
  }

  async deleteMultipleExpenses(ids: string[]): Promise<void> {
    await this.client.delete('/api/expenses/delete', { data: { ids } });
  }

  // Recurring Expenses
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    const response = await this.client.get('/api/recurring-expenses');
    return response.data;
  }

  async addRecurringExpense(expense: Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at'>): Promise<RecurringExpense> {
    const response = await this.client.put('/api/recurring-expense', expense);
    return response.data;
  }

  async updateRecurringExpense(id: string, expense: Partial<RecurringExpense>, updateAll: boolean = false): Promise<RecurringExpense> {
    const response = await this.client.put(`/api/recurring-expense/edit?id=${id}&updateAll=${updateAll}`, expense);
    return response.data;
  }

  async deleteRecurringExpense(id: string, removeAll: boolean = false): Promise<void> {
    await this.client.delete(`/api/recurring-expense/delete?id=${id}&removeAll=${removeAll}`);
  }

  // Config
  async getConfig(): Promise<Config> {
    const response = await this.client.get('/api/config');
    return response.data;
  }

  async getCategories(): Promise<string[]> {
    const response = await this.client.get('/api/categories');
    return response.data;
  }

  async updateCategories(categories: string[]): Promise<void> {
    await this.client.put('/api/categories/edit', categories);
  }

  async getCurrency(): Promise<string> {
    const response = await this.client.get('/api/currency');
    return response.data;
  }

  async updateCurrency(currency: string): Promise<void> {
    await this.client.put('/api/currency/edit', currency);
  }

  async getStartDate(): Promise<number> {
    const response = await this.client.get('/api/startdate');
    return response.data;
  }

  async updateStartDate(startDate: number): Promise<void> {
    await this.client.put('/api/startdate/edit', startDate);
  }

  // Sync
  async syncPull(lastSyncTime?: string): Promise<SyncPullResponse> {
    const response = await this.client.post('/api/sync/pull', {
      last_sync_time: lastSyncTime || null,
    });
    return response.data;
  }

  async syncPush(data: SyncPushRequest): Promise<SyncPushResponse> {
    const response = await this.client.post('/api/sync/push', data);
    return response.data;
  }

  async getSyncStatus(): Promise<{ has_synced: boolean; last_sync_time: string | null }> {
    const response = await this.client.get('/api/sync/status');
    return response.data;
  }

  // AI
  async getAIConfig(): Promise<AIConfig> {
    const response = await this.client.get('/api/ai/config');
    return response.data;
  }

  async updateAIConfig(config: AIConfig): Promise<void> {
    await this.client.put('/api/ai/config', config);
  }

  async testAIConnection(): Promise<{ status: string; message: string }> {
    const response = await this.client.post('/api/ai/test');
    return response.data;
  }

  // Voice
  async parseVoiceExpense(audioUri: string): Promise<{
    transcript: string;
    expenses: Array<{
      name: string;
      amount: number;
      category: string;
      date: string;
      confidence: number;
      ambiguous: boolean;
    }>;
  }> {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as unknown as Blob);

    const response = await this.client.post('/api/ai/voice/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const api = new ApiService();
