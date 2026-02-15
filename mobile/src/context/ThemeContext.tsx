import React, { createContext, useContext, useState, useCallback } from 'react';
import { colors as lightColors } from '../theme/colors';

const darkColors = {
  primary: '#10b77f',
  primaryDark: '#0d9668',
  primaryLight: '#34d399',
  primaryTint: 'rgba(16, 183, 127, 0.15)',
  primaryShadow: 'rgba(16, 183, 127, 0.3)',
  secondary: '#e2e8f0',
  accent: '#10b77f',
  background: '#10221c',
  backgroundDark: '#10221c',
  surface: '#162c25',
  card: '#162c25',
  text: '#f1f5f9',
  textSecondary: 'rgba(16, 183, 127, 0.6)',
  textMuted: '#64748b',
  border: '#1e3a31',
  borderLight: '#1e3a31',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b77f',
  overlay: 'rgba(0,0,0,0.7)',
} as const;

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  colors: lightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
