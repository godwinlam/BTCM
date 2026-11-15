import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  cardAlt: string;
  header: string;
  border: string;
  borderLight: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  accent: string;
  gold: string;
  green: string;
  red: string;
  cyan: string;
  purple: string;
  inputBg: string;
  inputBorder: string;
  modalOverlay: string;
  modalBg: string;
  pillBg: string;
  badgeBg: string;
}

export const darkColors: ThemeColors = {
  mode: 'dark',
  background: '#0B0E14',
  surface: '#0F172A',
  surfaceAlt: '#131824',
  card: '#131824',
  cardAlt: '#161B26',
  header: '#0F172A',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  text: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0B0E14',
  accent: '#F7931A',
  gold: '#FFD700',
  green: '#10B981',
  red: '#EF4444',
  cyan: '#06B6D4',
  purple: '#A855F7',
  inputBg: '#0F172A',
  inputBorder: '#1E293B',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  modalBg: 'rgba(15, 23, 42, 0.95)',
  pillBg: 'rgba(255, 255, 255, 0.06)',
  badgeBg: 'rgba(247, 147, 26, 0.15)',
};

export const lightColors: ThemeColors = {
  mode: 'light',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  card: '#FFFFFF',
  cardAlt: '#F8FAFC',
  header: '#FFFFFF',
  border: '#E2E8F0',
  borderLight: '#CBD5E1',
  borderSubtle: 'rgba(0, 0, 0, 0.05)',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',
  accent: '#D97706',
  gold: '#B45309',
  green: '#059669',
  red: '#DC2626',
  cyan: '#0891B2',
  purple: '#7C3AED',
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  modalOverlay: 'rgba(15, 23, 42, 0.5)',
  modalBg: 'rgba(255, 255, 255, 0.98)',
  pillBg: 'rgba(15, 23, 42, 0.06)',
  badgeBg: 'rgba(217, 119, 6, 0.15)',
};

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  isDark: true,
  colors: darkColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = 'btcm_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
      } catch (e) {
        // ignore
      }
    }
    return 'dark'; // Default theme is dark
  });

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch (e) {
        // ignore
      }
    }
  };

  const toggleTheme = () => {
    setTheme(themeMode === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', themeMode);
      const bg = themeMode === 'light' ? '#F8FAFC' : '#0B0E14';
      document.body.style.backgroundColor = bg;
      const root = document.getElementById('root');
      if (root) root.style.backgroundColor = bg;
    }
  }, [themeMode]);

  const isDark = themeMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeContext);
