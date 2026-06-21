import { describe, expect, it } from "vitest";
import enUS from "../../apps/omnihub-site/src/i18n/locales/en-US.json";
import frFR from "../../apps/omnihub-site/src/i18n/locales/fr-FR.json";
import esES from "../../apps/omnihub-site/src/i18n/locales/es-ES.json";
import deDE from "../../apps/omnihub-site/src/i18n/locales/de-DE.json";
import jaJP from "../../apps/omnihub-site/src/i18n/locales/ja-JP.json";
import zhCN from "../../apps/omnihub-site/src/i18n/locales/zh-CN.json";
import ptBR from "../../apps/omnihub-site/src/i18n/locales/pt-BR.json";

const locales = {
  "fr-FR": frFR,
  "es-ES": esES,
  "de-DE": deDE,
  "ja-JP": jaJP,
  "zh-CN": zhCN,
  "pt-BR": ptBR,
} as const;
const allowedSame = new Set([
  "hero.headline.line2",
  "maestro.headline.line1",
  "layout.footer.copyright",
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
});
