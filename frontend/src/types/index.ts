export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface Expense {
  id: string;
  recurringID?: string;
  name: string;
  tags: string[];
  category: string;
  amount: number;
  currency: string;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  currency: string;
  tags: string[];
  category: string;
  startDate: string;
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  occurrences: number;
  created_at?: string;
  updated_at?: string;
}

export interface Config {
  categories: string[];
  currency: string;
  startDate: number;
  updated_at?: string;
}

export interface SyncPullResponse {
  expenses: Expense[];
  recurring_expenses: RecurringExpense[];
  config: Config;
  server_time: string;
  is_full_sync: boolean;
}

export interface SyncPushRequest {
  expenses: Expense[];
  recurring_expenses: RecurringExpense[];
  config?: Config;
  client_time: string;
}

export interface SyncPushResponse {
  success: boolean;
  conflicts?: SyncConflict[];
  server_time: string;
  processed_ids: {
    expenses: string[];
    recurring_expenses: string[];
  };
}

export interface SyncConflict {
  type: 'expense' | 'recurring_expense' | 'config';
  id: string;
  client_data: any;
  server_data: any;
  resolution: 'server_wins' | 'client_wins';
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ParsedExpense {
  name: string;
  amount: number;
  category: string;
  date: string;
  confidence: number;
  ambiguous: boolean;
}

export interface VoiceParseResponse {
  transcript: string;
  expenses: ParsedExpense[];
}
