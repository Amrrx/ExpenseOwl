import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import type { Expense, RecurringExpense, Config, SyncPullResponse, SyncConflict } from '../types';

const LAST_SYNC_KEY = 'last_sync_time';
const PENDING_CHANGES_KEY = 'pending_changes';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

interface PendingChange {
  id: string;
  type: 'expense' | 'recurring_expense' | 'config';
  action: 'create' | 'update' | 'delete';
  data: Expense | RecurringExpense | Config | null;
  timestamp: string;
}

interface SyncState {
  status: SyncStatus;
  lastSyncTime: string | null;
  pendingChanges: PendingChange[];
  conflicts: SyncConflict[];
  isOnline: boolean;
  error: string | null;
}

interface SyncActions {
  initialize: () => Promise<void>;
  sync: () => Promise<SyncPullResponse | null>;
  addPendingChange: (change: Omit<PendingChange, 'timestamp'>) => Promise<void>;
  clearPendingChanges: () => Promise<void>;
  setOnline: (online: boolean) => void;
  setStatus: (status: SyncStatus) => void;
  clearError: () => void;
}

type SyncStore = SyncState & SyncActions;

export const useSyncStore = create<SyncStore>((set, get) => ({
  status: 'idle',
  lastSyncTime: null,
  pendingChanges: [],
  conflicts: [],
  isOnline: true,
  error: null,

  initialize: async () => {
    try {
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      const pendingJson = await AsyncStorage.getItem(PENDING_CHANGES_KEY);
      const pending = pendingJson ? JSON.parse(pendingJson) as PendingChange[] : [];

      set({
        lastSyncTime: lastSync,
        pendingChanges: pending,
        status: pending.length > 0 ? 'idle' : 'synced',
      });
    } catch {
      set({ status: 'error', error: 'Failed to initialize sync state' });
    }
  },

  sync: async () => {
    const { lastSyncTime, pendingChanges, isOnline } = get();

    if (!isOnline) {
      set({ status: 'offline' });
      return null;
    }

    set({ status: 'syncing', error: null });

    try {
      // Push pending changes first
      if (pendingChanges.length > 0) {
        const expenses = pendingChanges
          .filter(c => c.type === 'expense' && c.action !== 'delete' && c.data)
          .map(c => c.data as Expense);

        const recurringExpenses = pendingChanges
          .filter(c => c.type === 'recurring_expense' && c.action !== 'delete' && c.data)
          .map(c => c.data as RecurringExpense);

        const configChange = pendingChanges.find(c => c.type === 'config' && c.data);
        const config = configChange ? configChange.data as Config : undefined;

        const pushResponse = await api.syncPush({
          expenses,
          recurring_expenses: recurringExpenses,
          config,
          client_time: new Date().toISOString(),
        });

        if (pushResponse.conflicts && pushResponse.conflicts.length > 0) {
          set({ conflicts: pushResponse.conflicts });
        }

        await get().clearPendingChanges();
      }

      // Pull latest from server
      const pullResponse = await api.syncPull(lastSyncTime || undefined);
      const serverTime = pullResponse.server_time;

      await AsyncStorage.setItem(LAST_SYNC_KEY, serverTime);

      set({
        status: 'synced',
        lastSyncTime: serverTime,
      });

      return pullResponse;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      set({ status: 'error', error: message });
      return null;
    }
  },

  addPendingChange: async (change) => {
    const { pendingChanges } = get();
    const newChange: PendingChange = {
      ...change,
      timestamp: new Date().toISOString(),
    };

    // Replace existing change for same item
    const filtered = pendingChanges.filter(
      c => !(c.type === change.type && c.id === change.id)
    );
    const updated = [...filtered, newChange];

    await AsyncStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(updated));
    set({ pendingChanges: updated, status: 'idle' });
  },

  clearPendingChanges: async () => {
    await AsyncStorage.removeItem(PENDING_CHANGES_KEY);
    set({ pendingChanges: [], conflicts: [] });
  },

  setOnline: (online) => {
    set({ isOnline: online, status: online ? 'idle' : 'offline' });
  },

  setStatus: (status) => set({ status }),

  clearError: () => set({ error: null }),
}));
