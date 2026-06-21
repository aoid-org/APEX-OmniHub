import { useTranslation } from "react-i18next";
import {
  getLocaleInfo,
  resolveSupportedLocale,
  type LangCode,
  type LocaleInfo,
} from "./locales";

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

export function useAppTranslation(): AppTranslation {
  const { t, i18n, ready } = useTranslation();
  const language = resolveSupportedLocale(
    i18n.resolvedLanguage ?? i18n.language
  );
  const locale = getLocaleInfo(language);
  const tx = (key: string, options?: TranslationOptions): string => {
    if (i18n.exists(key, { lng: language })) {
      return t(key, options);
    }

    if (i18n.exists(key, { lng: "en-US" })) {
      return t(key, { ...options, lng: "en-US" });
    }

    if (options?.defaultValue && options.defaultValue !== key) {
      return options.defaultValue;
    }

    return import.meta.env.PROD
      ? `Missing translation: ${key}`
      : `⟦missing:${key}⟧`;
  };
  return { t, i18n, ready, language, locale, tx };
}

export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
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
