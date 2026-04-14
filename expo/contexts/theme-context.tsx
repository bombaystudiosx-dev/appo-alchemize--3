import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const THEME_STORAGE_KEY = '@alchemize_theme';

export type Theme = 'cosmic-dark' | 'cosmic';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const [theme, setThemeState] = useState<Theme>('cosmic-dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY).catch(() => null);
      if (stored && typeof stored === 'string' && (stored === 'cosmic-dark' || stored === 'cosmic')) {
        setThemeState(stored as Theme);
        console.log('[Theme] Loaded theme:', stored);
      }
    } catch (error) {
      console.error('[Theme] Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
      setThemeState(newTheme);
      console.log('[Theme] Theme saved:', newTheme);
    } catch (error) {
      console.error('[Theme] Error saving theme:', error);
    }
  };

  return {
    theme,
    setTheme,
    isLoading,
  };
});