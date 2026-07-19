import { useTranslation } from "react-i18next";
import enUS from "./locales/en-US.json";
import {
  getLocaleInfo,
  resolveSupportedLocale,
  type LangCode,
  type LocaleInfo,
} from "./locales";

function getNestedFallback(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let curr: unknown = obj;
  for (const part of parts) {
    if (curr && typeof curr === "object" && part in curr) {
      curr = (curr as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof curr === "string" ? curr : undefined;
}

type TranslationOptions = Record<
  string,
  string | number | boolean | null | undefined
> & { defaultValue?: string };

export type AppTranslation = Readonly<{
  t: ReturnType<typeof useTranslation>["t"];
  i18n: ReturnType<typeof useTranslation>["i18n"];
  ready: ReturnType<typeof useTranslation>["ready"];
  language: LangCode;
  locale: LocaleInfo;
  tx: (key: string, options?: TranslationOptions) => string;
}>;

// ---------------------------------------------------------------------------
// Interpolation helper — extracted to reduce cognitive complexity of `tx`.
// ---------------------------------------------------------------------------
function interpolateTemplate(
  template: string,
  options: TranslationOptions
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    const val = options[k];
    return val !== undefined && val !== null ? String(val) : `{{${k}}}`;
  });
}

// ---------------------------------------------------------------------------
// Fallback resolution helper — reduces nesting depth in `tx`.
// ---------------------------------------------------------------------------
function resolveFromFallback(
  fallback: string,
  options: TranslationOptions | undefined
): string {
  if (options && typeof options === "object") {
    return interpolateTemplate(fallback, options);
  }
  return fallback;
}

export function useAppTranslation(): AppTranslation {
  const { t, i18n, ready } = useTranslation();
  const language = resolveSupportedLocale(
    i18n.resolvedLanguage ?? i18n.language
  );
  const locale = getLocaleInfo(language);

  const tx = (key: string, options?: TranslationOptions): string => {
    // 1. Try exact locale match
    if (typeof i18n?.exists === "function") {
      if (i18n.exists(key, { lng: language })) {
        return t(key, options);
      }
      // 2. Fall back to en-US via i18next
      if (i18n.exists(key, { lng: "en-US" })) {
        return t(key, { ...options, lng: "en-US" });
      }
    }

    // 3. Static en-US bundle lookup
    const fallback = getNestedFallback(
      enUS as Record<string, unknown>,
      key
    );
    if (fallback) {
      return resolveFromFallback(fallback, options);
    }

    // 4. i18next last-resort
    if (typeof t === "function") {
      const res = t(key, options);
      if (res && res !== key && !res.startsWith("⟦missing:")) {
        return res;
      }
    }

    // 5. Explicit defaultValue
    if (options?.defaultValue && options.defaultValue !== key) {
      return options.defaultValue;
    }

    // 6. Dev/prod missing-key indicator
    return import.meta.env.PROD
      ? `Missing translation: ${key}`
      : `⟦missing:${key}⟧`;
  };

  return { t, i18n, ready, language, locale, tx };
}

export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string")
  );
}

export type TranslatedCard = Readonly<{
  title?: string;
  desc: string;
  key?: string;
  name?: string;
}>;

export function isTranslatedCardArray(
  value: unknown
): value is TranslatedCard[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (typeof item !== "object" || item === null) return false;
      const candidate = item as Record<string, unknown>;
      const hasTitle =
        typeof candidate.title === "string" ||
        typeof candidate.name === "string";
      return hasTitle && typeof candidate.desc === "string";
    })
  );
}
