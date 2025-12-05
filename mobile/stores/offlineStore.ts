import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import type { Expense, RecurringExpense, Config } from '../types';

const CACHED_EXPENSES_KEY = 'cached_expenses';
const CACHED_RECURRING_KEY = 'cached_recurring';
const CACHED_CONFIG_KEY = 'cached_config';
const OFFLINE_QUEUE_KEY = 'offline_queue';

interface OfflineAction {
  id: string;
  type: 'expense' | 'recurring_expense';
  action: 'create' | 'update' | 'delete';
  data: Expense | RecurringExpense | null;
  timestamp: string;
}

interface OfflineState {
  isOnline: boolean;
  cachedExpenses: Expense[];
  cachedRecurring: RecurringExpense[];
  cachedConfig: Config | null;
  offlineQueue: OfflineAction[];
  isInitialized: boolean;
}

interface OfflineActions {
  initialize: () => Promise<void>;
  setOnline: (online: boolean) => void;
  cacheExpenses: (expenses: Expense[]) => Promise<void>;
  cacheRecurring: (recurring: RecurringExpense[]) => Promise<void>;
  cacheConfig: (config: Config) => Promise<void>;
  addToQueue: (action: Omit<OfflineAction, 'timestamp'>) => Promise<void>;
  clearQueue: () => Promise<void>;
  getQueuedActions: () => OfflineAction[];
}

type OfflineStore = OfflineState & OfflineActions;

export const useOfflineStore = create<OfflineStore>((set, get) => ({
  isOnline: true,
  cachedExpenses: [],
  cachedRecurring: [],
  cachedConfig: null,
  offlineQueue: [],
  isInitialized: false,

  initialize: async () => {
    try {
      // Check network status
      const netState = await NetInfo.fetch();
      const online = netState.isConnected ?? true;

      // Load cached data
      const [expensesJson, recurringJson, configJson, queueJson] = await Promise.all([
        AsyncStorage.getItem(CACHED_EXPENSES_KEY),
        AsyncStorage.getItem(CACHED_RECURRING_KEY),
        AsyncStorage.getItem(CACHED_CONFIG_KEY),
        AsyncStorage.getItem(OFFLINE_QUEUE_KEY),
      ]);

      const expenses = expensesJson ? JSON.parse(expensesJson) as Expense[] : [];
      const recurring = recurringJson ? JSON.parse(recurringJson) as RecurringExpense[] : [];
      const config = configJson ? JSON.parse(configJson) as Config : null;
      const queue = queueJson ? JSON.parse(queueJson) as OfflineAction[] : [];

      set({
        isOnline: online,
        cachedExpenses: expenses,
        cachedRecurring: recurring,
        cachedConfig: config,
        offlineQueue: queue,
        isInitialized: true,
      });

      // Subscribe to network changes
      NetInfo.addEventListener(state => {
        get().setOnline(state.isConnected ?? true);
      });
    } catch {
      set({ isInitialized: true });
    }
  },

  setOnline: (online) => {
    set({ isOnline: online });
  },

  cacheExpenses: async (expenses) => {
    await AsyncStorage.setItem(CACHED_EXPENSES_KEY, JSON.stringify(expenses));
    set({ cachedExpenses: expenses });
  },

  cacheRecurring: async (recurring) => {
    await AsyncStorage.setItem(CACHED_RECURRING_KEY, JSON.stringify(recurring));
    set({ cachedRecurring: recurring });
  },

  cacheConfig: async (config) => {
    await AsyncStorage.setItem(CACHED_CONFIG_KEY, JSON.stringify(config));
    set({ cachedConfig: config });
  },

  addToQueue: async (action) => {
    const { offlineQueue } = get();
    const newAction: OfflineAction = {
      ...action,
      timestamp: new Date().toISOString(),
    };

    // Remove existing action for same item (keep only latest)
    const filtered = offlineQueue.filter(
      a => !(a.type === action.type && a.id === action.id)
    );
    const updated = [...filtered, newAction];

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    set({ offlineQueue: updated });
  },

  clearQueue: async () => {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    set({ offlineQueue: [] });
  },

  getQueuedActions: () => get().offlineQueue,
}));
