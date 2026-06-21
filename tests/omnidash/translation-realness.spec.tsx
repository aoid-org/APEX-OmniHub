import { describe, expect, it } from "vitest";
import enUS from "../../apps/omnihub-site/src/i18n/locales/en-US.json";
import frFR from "../../apps/omnihub-site/src/i18n/locales/fr-FR.json";
import esES from "../../apps/omnihub-site/src/i18n/locales/es-ES.json";
import deDE from "../../apps/omnihub-site/src/i18n/locales/de-DE.json";
import jaJP from "../../apps/omnihub-site/src/i18n/locales/ja-JP.json";
import zhCN from "../../apps/omnihub-site/src/i18n/locales/zh-CN.json";
import ptBR from "../../apps/omnihub-site/src/i18n/locales/pt-BR.json";
import ar from "../../apps/omnihub-site/src/i18n/locales/ar.json";
import hiIN from "../../apps/omnihub-site/src/i18n/locales/hi-IN.json";
import { SUPPORTED_LOCALES } from "../../apps/omnihub-site/src/i18n/locales";

const locales = {
  "fr-FR": frFR,
  "es-ES": esES,
  "de-DE": deDE,
  "ja-JP": jaJP,
  "zh-CN": zhCN,
  "pt-BR": ptBR,
  ar: ar,
  "hi-IN": hiIN,
} as const;
const allowedSame = new Set([
  "hero.headline.line2",
  "maestro.headline.line1",
  "layout.footer.copyright",
  "hero.art.intelliDesig",
  "layout.theme.light",
  "layout.theme.dark",
  "modal.placeholders.email",
]);

function flatten(
  value: unknown,
  prefix = "",
  out = new Map<string, unknown>()
): Map<string, unknown> {
  out.set(prefix || "$", value);
  if (Array.isArray(value))
    value.forEach((item, index) => flatten(item, `${prefix}.${index}`, out));
  else if (value && typeof value === "object")
    Object.entries(value).forEach(([key, item]) =>
      flatten(item, prefix ? `${prefix}.${key}` : key, out)
    );
  return out;
}

describe("Translation realness contract", () => {
  const canonical = flatten(enUS);

  it("keeps locale key parity with en-US", () => {
    const keys = [...canonical.keys()].sort();
    for (const [locale, dictionary] of Object.entries(locales)) {
      const actual = flatten(dictionary);
      expect([...actual.keys()].sort(), locale).toEqual(keys);
    }
  });

  it("keeps non-English public anchors translated", () => {
    const stringKeys = [...canonical.entries()]
      .filter(([, value]) => typeof value === "string")
      .map(([key]) => key);
    for (const [locale, dictionary] of Object.entries(locales)) {
      const actual = flatten(dictionary);
      const same = stringKeys.filter(
        (key) =>
          canonical.get(key) === actual.get(key) &&
          !key.endsWith(".key") &&
          !allowedSame.has(key)
      );
      expect(
        same.length / stringKeys.length,
        `${locale}: ${same.slice(0, 12).join(", ")}`
      ).toBeLessThan(0.2);
    }
  });

  it("has no duplicate locale codes in SUPPORTED_LOCALES", () => {
    const codes = SUPPORTED_LOCALES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("includes ar with dir rtl", () => {
    const arLocale = SUPPORTED_LOCALES.find((l) => l.code === "ar");
    expect(arLocale).toBeDefined();
    expect(arLocale?.dir).toBe("rtl");
    expect(arLocale?.nativeLabel).toBe("العربية");
  });

  it("includes hi-IN with dir ltr", () => {
    const hiLocale = SUPPORTED_LOCALES.find((l) => l.code === "hi-IN");
    expect(hiLocale).toBeDefined();
    expect(hiLocale?.dir).toBe("ltr");
    expect(hiLocale?.nativeLabel).toBe("हिन्दी");
  });

  it("has no blank strings in ar or hi-IN", () => {
    for (const [code, dict] of [["ar", ar], ["hi-IN", hiIN]] as const) {
      const flat = flatten(dict);
      for (const [key, value] of flat) {
        if (typeof value === "string") {
          expect(value.trim(), `${code}: blank string at ${key}`).not.toBe("");
        }
      }
    }
  });

  it("has no missing-key diagnostics committed in ar or hi-IN", () => {
    for (const [code, dict] of [["ar", ar], ["hi-IN", hiIN]] as const) {
      const flat = flatten(dict);
      for (const [key, value] of flat) {
        if (typeof value === "string") {
          expect(value, `${code}: diagnostic at ${key}`).not.toMatch(
            /⟦missing:|Missing translation:/
          );
        }
      }
    }
  });
});
