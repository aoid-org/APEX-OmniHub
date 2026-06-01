import { useState, useEffect } from 'react';

export type ThemeType = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    return (localStorage.getItem('omni_theme_preference') as ThemeType) || 'system';
  });

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem('omni_theme_preference', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    let appliedTheme = theme;
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      appliedTheme = prefersDark ? 'dark' : 'light';
    }

    root.setAttribute('data-theme', appliedTheme);

    // Optional: listen for system changes if theme is system
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Derived boolean for backward compatibility with OmniDashShell's isDark state
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return { theme, setTheme, isDark };
}
