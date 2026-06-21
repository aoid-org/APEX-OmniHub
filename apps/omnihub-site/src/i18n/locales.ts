export type LangCode =
  | "en-US"
  | "fr-FR"
  | "es-ES"
  | "de-DE"
  | "ja-JP"
  | "zh-CN"
  | "pt-BR";

export interface LocaleInfo {
  code: LangCode;
  label: string;
  nativeLabel: string;
  dir: "ltr" | "rtl";
}

export const DEFAULT_LOCALE: LangCode = "en-US";

export const SUPPORTED_LOCALES: readonly LocaleInfo[] = [
  { code: "en-US", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "fr-FR", label: "French", nativeLabel: "Français", dir: "ltr" },
  { code: "es-ES", label: "Spanish", nativeLabel: "Español", dir: "ltr" },
  { code: "de-DE", label: "German", nativeLabel: "Deutsch", dir: "ltr" },
  { code: "ja-JP", label: "Japanese", nativeLabel: "日本語", dir: "ltr" },
  {
    code: "zh-CN",
    label: "Chinese (Simplified)",
    nativeLabel: "简体中文",
    dir: "ltr",
  },
  {
    code: "pt-BR",
    label: "Portuguese (Brazil)",
    nativeLabel: "Português (Brasil)",
    dir: "ltr",
  },
];

const BASE_LANGUAGE_MATCHES: Readonly<Record<string, LangCode>> = {
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
  ja: "ja-JP",
  zh: "zh-CN",
  "zh-hans": "zh-CN",
  pt: "pt-BR",
};

export function isSupportedLocale(code: string): code is LangCode {
  return SUPPORTED_LOCALES.some((locale) => locale.code === code);
}

export function resolveSupportedLocale(input?: string | null): LangCode {
  if (!input) return DEFAULT_LOCALE;
  const normalized = input.trim().replace("_", "-");
  if (isSupportedLocale(normalized)) return normalized;

  const lower = normalized.toLowerCase();
  const exact = SUPPORTED_LOCALES.find(
    (locale) => locale.code.toLowerCase() === lower
  );
  if (exact) return exact.code;

  const [base] = lower.split("-");
  return (
    BASE_LANGUAGE_MATCHES[lower] ??
    BASE_LANGUAGE_MATCHES[base] ??
    DEFAULT_LOCALE
  );
}

export function getLocaleInfo(code: string): LocaleInfo {
  const resolved = resolveSupportedLocale(code);
  return (
    SUPPORTED_LOCALES.find((locale) => locale.code === resolved) ??
    SUPPORTED_LOCALES[0]
  );
}
