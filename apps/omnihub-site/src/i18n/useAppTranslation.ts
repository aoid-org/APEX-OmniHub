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
>;

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
  const tx = (key: string, options?: TranslationOptions): string =>
    t(key, options);
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
