import { useState, useEffect } from 'react';

export type ThemeType = 'light' | 'dark' | 'system';

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
    
    if (theme === 'system') {
      const prefersDark = globalThis.matchMedia('(prefers-color-scheme: dark)').matches;
      appliedTheme = prefersDark ? 'dark' : 'light';
    }

    root.dataset.theme = appliedTheme;

    // Optional: listen for system changes if theme is system
    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        root.dataset.theme = e.matches ? 'dark' : 'light';
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Derived boolean for backward compatibility with OmniDashShell's isDark state
  const isDark = theme === 'dark' || (theme === 'system' && globalThis.matchMedia('(prefers-color-scheme: dark)').matches);

  return { theme, setTheme, isDark };
}
