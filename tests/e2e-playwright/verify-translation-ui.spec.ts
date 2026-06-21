import { expect, test } from "@playwright/test";

const locales = [
  { code: "fr-FR", label: "Français", anchor: "L'Orchestrateur" },
  { code: "es-ES", label: "Español", anchor: "Orquestador" },
  { code: "de-DE", label: "Deutsch", anchor: "Orchestrierer" },
  { code: "ja-JP", label: "日本語", anchor: "コンソール" },
  { code: "zh-CN", label: "简体中文", anchor: "控制台" },
  { code: "pt-BR", label: "Português (Brasil)", anchor: "console" },
];

test.describe("public language switcher", () => {
  for (const locale of locales) {
    test(`translates home anchors and persists ${locale.code}`, async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByRole("button", {
          name: /select site language|seleccionar|choisir|seitensprache|サイト言語|选择网站|selecionar/i,
        })
        .first()
        .click();
      await page.getByRole("button", { name: locale.label }).click();
      await expect(page.getByText(locale.label).first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
      await expect(
        page.getByText(locale.anchor, { exact: false }).first()
      ).toBeVisible();
      await expect(
        page.locator(".pill, .btn").filter({ hasText: /^\s*$/ })
      ).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText(
        /hero\.headline|layout\.nav|modal\.title/
      );
      await expect
        .poll(async () =>
          page.evaluate(() => localStorage.getItem("apex_locale"))
        )
        .toBe(locale.code);
      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
      await expect(page.getByText(locale.label).first()).toBeVisible();
    });
  }
});
