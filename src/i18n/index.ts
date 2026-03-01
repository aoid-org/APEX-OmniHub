/**
 * APEX Language Fabric — Public API
 *
 * LAW 2: CONTEXT OVER PROP-DRILLING
 *   UI locale state lives exclusively in LocaleProvider singleton.
 *   Never re-derive downstream.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  createElement,
} from 'react';
import { resolveLangCode, type LangCode } from './locales';
import { resolveTranslation } from './dictionaries';

// Re-export primitives
export { LOCALES, resolveLangCode, type LangCode } from './locales';
export type { DictionaryKey } from './dictionaries';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface I18nContextValue {
  /** Translation function. Missing key -> English value silently. */
  t: (key: string) => string;
  /** Current language code (ISO-639-1) */
  lang: LangCode;
  /** Set locale from BCP-47 tag — resolved through resolveLangCode() */
  setLocale: (tag: string) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface LocaleProviderProps {
  children: ReactNode;
  /** Initial BCP-47 locale tag. Defaults to navigator.language or 'en'. */
  initialLocale?: string;
}

/**
 * LocaleProvider — Singleton context for UI locale state.
 * Resolves BCP-47 input to LangCode at boundary. Internal surface is ISO-639-1 only.
 */
export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [lang, setLang] = useState<LangCode>(() => {
    if (initialLocale) return resolveLangCode(initialLocale);
    if (globalThis.navigator?.language !== undefined) {
      return resolveLangCode(globalThis.navigator.language);
    }
    return 'en';
  });

  const setLocale = useCallback((tag: string) => {
    setLang(resolveLangCode(tag));
  }, []);

  const t = useCallback(
    (key: string): string => resolveTranslation(lang, key),
    [lang]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ t, lang, setLocale }),
    [t, lang, setLocale]
  );

  return createElement(I18nContext.Provider, { value }, children);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useI18n — access translation function, current lang, and locale setter.
 *
 * Hook contract:
 *   { t: (key: string) => string; lang: LangCode; setLocale: (tag: string) => void }
 *
 * Missing dictionary key -> returns English value silently. Never returns raw key.
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within a <LocaleProvider>');
  }
  return ctx;
}
