import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, ThemeColors, ColorScheme } from './colors';

type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  colors: ThemeColors;
  colorScheme: ColorScheme;
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = '@xpense_theme_preference';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemePreferenceState(stored);
      }
      setIsLoaded(true);
    });
  }, []);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
  };

  const colorScheme: ColorScheme =
    themePreference === 'system'
      ? (systemColorScheme === 'dark' ? 'dark' : 'light')
      : themePreference;

  const themeColors = colors[colorScheme];

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        colors: themeColors,
        colorScheme,
        isDark: colorScheme === 'dark',
        themePreference,
        setThemePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
