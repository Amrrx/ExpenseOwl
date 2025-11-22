import axios, { AxiosInstance } from 'axios';
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
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
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
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token');
            }

            const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
              refresh_token: refreshToken,
            });

            const { access_token, refresh_token: newRefreshToken } = response.data;
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', newRefreshToken);

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/register', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/login', data);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/api/auth/logout');
  }

  async verifyGoogleToken(idToken: string): Promise<AuthResponse> {
    const response = await this.client.post('/api/auth/google/verify', {
      id_token: idToken,
    });
    return response.data;
  }

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

  async getConfig(): Promise<Config> {
    const response = await this.client.get('/api/config');
    return response.data;
  }

  async getCategories(): Promise<string[]> {
    const response = await this.client.get('/api/categories');
    return response.data;
  }

  async updateCategories(categories: string[]): Promise<void> {
    await this.client.put('/api/categories/edit', { categories });
  }

  async getCurrency(): Promise<string> {
    const response = await this.client.get('/api/currency');
    return response.data;
  }

  async updateCurrency(currency: string): Promise<void> {
    await this.client.put('/api/currency/edit', { currency });
  }

  async getStartDate(): Promise<number> {
    const response = await this.client.get('/api/startdate');
    return response.data;
  }

  async updateStartDate(startDate: number): Promise<void> {
    await this.client.put('/api/startdate/edit', { start_date: startDate });
  }

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
}

export const api = new ApiService();
