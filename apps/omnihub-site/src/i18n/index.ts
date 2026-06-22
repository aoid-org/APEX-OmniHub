/** APEX OmniHub i18n Initialization */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enUS from "./locales/en-US.json";
import frFR from "./locales/fr-FR.json";
import esES from "./locales/es-ES.json";
import deDE from "./locales/de-DE.json";
import jaJP from "./locales/ja-JP.json";
import zhCN from "./locales/zh-CN.json";
import ptBR from "./locales/pt-BR.json";
import ar from "./locales/ar.json";
import hiIN from "./locales/hi-IN.json";

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleInfo,
  resolveSupportedLocale,
} from "./locales";

const isProd = import.meta.env.PROD;
const missingTranslation = (key: string, defaultValue?: string) =>
  defaultValue && defaultValue !== key
    ? defaultValue
    : `Missing translation: ${key}`;
const supportedLngs = SUPPORTED_LOCALES.map((locale) => locale.code);

function syncDocumentLocale(language: string): void {
  if (typeof document === "undefined") return;
  const locale = getLocaleInfo(language);
  document.documentElement.lang = locale.code;
  document.documentElement.dir = locale.dir;
  try {
    globalThis.localStorage?.setItem("apex_locale", locale.code);
  } catch {
    // Non-browser/locked storage contexts should not prevent rendering.
  }
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "en-US": { translation: enUS },
      "fr-FR": { translation: frFR },
      "es-ES": { translation: esES },
      "de-DE": { translation: deDE },
      "ja-JP": { translation: jaJP },
      "zh-CN": { translation: zhCN },
      "pt-BR": { translation: ptBR },
      ar: { translation: ar },
      "hi-IN": { translation: hiIN },
    },
    supportedLngs,
    fallbackLng: DEFAULT_LOCALE,
    cleanCode: true,
    load: "currentOnly",
    // Web Vitals (CLS): all locale resources are bundled inline, so initialize
    // synchronously. This guarantees translated copy is present on the very
    // first paint instead of briefly rendering keys/fallback and reflowing once
    // init resolves on a later tick — which shifts text-heavy sections.
    initImmediate: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "apex_locale",
      caches: ["localStorage"],
      convertDetectedLanguage: (language: string) =>
        resolveSupportedLocale(language),
    },
    debug: !isProd,
    parseMissingKeyHandler: (key: string, defaultValue?: string) =>
      isProd ? missingTranslation(key, defaultValue) : `⟦missing:${key}⟧`,
    react: { useSuspense: false },
  });

i18n.on("languageChanged", syncDocumentLocale);
syncDocumentLocale(
  resolveSupportedLocale(i18n.resolvedLanguage ?? i18n.language)
);

export default i18n;
