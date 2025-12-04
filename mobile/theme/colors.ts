export const colors = {
  light: {
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    background: '#f9fafb',
    surface: '#ffffff',
    surfaceSecondary: '#f3f4f6',
    text: '#111827',
    textSecondary: '#6b7280',
    textTertiary: '#9ca3af',
    border: '#e5e7eb',
    success: '#10b981',
    successLight: '#d1fae5',
    danger: '#ef4444',
    dangerLight: '#fee2e2',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    info: '#3b82f6',
    infoLight: '#dbeafe',
  },
  dark: {
    primary: '#818cf8',
    primaryDark: '#6366f1',
    background: '#030712',
    surface: '#111827',
    surfaceSecondary: '#1f2937',
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    textTertiary: '#6b7280',
    border: '#374151',
    success: '#34d399',
    successLight: '#064e3b',
    danger: '#f87171',
    dangerLight: '#7f1d1d',
    warning: '#fbbf24',
    warningLight: '#78350f',
    info: '#60a5fa',
    infoLight: '#1e3a8a',
  },
} as const;

export const chartColors = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#a855f7', // purple
  '#64748b', // slate
];

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  success: string;
  successLight: string;
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
  info: string;
  infoLight: string;
}
