import { useState, useEffect } from 'react';

export type ThemeType = 'light' | 'dark' | 'system';

const hasMatchMedia = typeof globalThis.matchMedia === 'function';

export function useTheme() {
  const [themeValue, setThemeValue] = useState<ThemeType>(() => {
    return (localStorage.getItem('omni_theme_preference') as ThemeType) || 'system';
  });

  const theme = themeValue;

  const setTheme = (newTheme: ThemeType) => {
    setThemeValue(newTheme);
    localStorage.setItem('omni_theme_preference', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    let appliedTheme = theme;

    if (theme === 'system' && hasMatchMedia) {
      appliedTheme = globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else if (theme === 'system') {
      appliedTheme = 'dark';
    }

    root.dataset.theme = appliedTheme;

    if (!hasMatchMedia) return;
    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        root.dataset.theme = e.matches ? 'dark' : 'light';
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const isDark = theme === 'dark' || (theme === 'system' && hasMatchMedia && globalThis.matchMedia('(prefers-color-scheme: dark)').matches);

  return { theme, setTheme, isDark };
}
