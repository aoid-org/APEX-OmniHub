import { useCallback, useEffect, useMemo, useState } from "react";

export type OmniTheme = "dark" | "light";
const THEME_KEY = "apex.omnidash.theme";

/** Apply theme to <html> so CSS + icons all respond. */
function applyThemeToDom(theme: OmniTheme): void {
  const root = globalThis.document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function resolveInitialTheme(): OmniTheme {
  if (typeof globalThis.window === "undefined") return "dark";
  const saved = globalThis.localStorage.getItem(THEME_KEY) as OmniTheme | null;
  if (saved === "dark" || saved === "light") return saved;
  const prefersDark = globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

export function useOmniTheme() {
  const [theme, setTheme] = useState<OmniTheme>(() => resolveInitialTheme());

  useEffect(() => {
    if (typeof globalThis.window === "undefined") return;
    globalThis.localStorage.setItem(THEME_KEY, theme);
    applyThemeToDom(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const setThemeExplicit = useCallback((t: OmniTheme) => setTheme(t), []);

  return useMemo(
    () => ({ theme, isDark: theme === "dark", toggleTheme, setTheme: setThemeExplicit }),
    [theme, toggleTheme, setThemeExplicit]
  );
}
