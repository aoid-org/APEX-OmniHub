/**
 * APEX Language Fabric — Single Source of Truth
 *
 * TYPE DEFINITIONS (never rename):
 *   LocaleTag = BCP-47 string    — browser/Intl API boundary (e.g., 'en-US', 'zh-CN')
 *   LangCode  = ISO-639-1 base   — internal system boundary  (e.g., 'en', 'zh')
 *
 * DETERMINISTIC MAPPING:
 *   LangCode = LocaleTag.split('-')[0].toLowerCase()
 *   Special case: any zh-* variant -> 'zh'
 *   Unknown input -> return 'en' (never throw)
 */

export const LOCALES = ['en', 'es', 'de', 'ja', 'fr', 'pt', 'zh'] as const;

export type LangCode = typeof LOCALES[number];



/**
 * resolveLangCode — the ONLY locale translation function
 *
 * Crossing point between external BCP-47 surface and internal ISO-639-1 surface.
 * Pure function, zero dependencies, deterministic.
 *
 * @param input - BCP-47 locale tag or any string
 * @returns LangCode — guaranteed member of LOCALES; defaults to 'en'
 */
export function resolveLangCode(input: string): LangCode {
  const base = input.split('-')[0].toLowerCase();
  return (LOCALES as readonly string[]).includes(base)
    ? (base as LangCode)
    : 'en';
}
