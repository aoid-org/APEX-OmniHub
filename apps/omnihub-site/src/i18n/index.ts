/**
 * APEX OmniHub i18n Initialization
 * Triple-layer key leak prevention:
 *   1. parseMissingKeyHandler returns "" in production
 *   2. Every t() call uses defaultValue with hardcoded English
 *   3. i18n-check.mjs enforces key parity across all locales
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enUS from './locales/en-US.json';
import frFR from './locales/fr-FR.json';
import esES from './locales/es-ES.json';
import deDE from './locales/de-DE.json';
import jaJP from './locales/ja-JP.json';
import zhCN from './locales/zh-CN.json';
import ptBR from './locales/pt-BR.json';

const isProd = import.meta.env.PROD;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-US': { translation: enUS },
      'fr-FR': { translation: frFR },
      'es-ES': { translation: esES },
      'de-DE': { translation: deDE },
      'ja-JP': { translation: jaJP },
      'zh-CN': { translation: zhCN },
      'pt-BR': { translation: ptBR },
    },
    supportedLngs: ['en-US', 'fr-FR', 'es-ES', 'de-DE', 'ja-JP', 'zh-CN', 'pt-BR'],
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false, // React handles XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'apex_locale',
      caches: ['localStorage'],
    },
    debug: !isProd,
    parseMissingKeyHandler: (key: string) => {
      // Production: return empty string to prevent key leakage
      // Dev: return key for debugging visibility
      if (isProd) return '';
      return key;
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
