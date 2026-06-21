import { expect, test } from "@playwright/test";

const locales = [
  {
    code: "fr-FR",
    label: "Français",
    hero: "L'Orchestrateur",
    nav: "Spécifications techniques",
  },
  {
    code: "es-ES",
    label: "Español",
    hero: "Orquestador",
    nav: "Especificaciones técnicas",
  },
  {
    code: "de-DE",
    label: "Deutsch",
    hero: "Orchestrierer",
    nav: "Technische Daten",
  },
  {
    code: "ja-JP",
    label: "日本語",
    hero: "オーケストレーター",
    nav: "技術仕様",
  },
  {
    code: "zh-CN",
    label: "简体中文",
    hero: "编排器",
    nav: "技术规格",
  },
  {
    code: "pt-BR",
    label: "Português (Brasil)",
    hero: "Orquestrador",
    nav: "Especificações técnicas",
  },
];

const translatedPublicRoutes = [
  "/",
  "/story",
  "/tech-specs",
  "/features/man-mode",
  "/privacy",
  "/terms",
  "/request-access",
  "/maestro",
  "/omniport",
  "/orchestrator",
  "/tri-force",
  "/product/omnidash",
  "/demo",
];

const staticPublicRoutes = ["/manifesto"];

async function selectLocale(
  page: import("@playwright/test").Page,
  label: string
) {
  await page
    .getByRole("button", {
      name: /select site language|seleccionar|choisir|seitensprache|サイト言語|选择网站|selecionar/i,
    })
    .first()
    .click();
  await page.getByRole("button", { name: label }).click();
}

async function expectNoI18nLeaks(page: import("@playwright/test").Page) {
  await expect(page.locator("body")).not.toContainText(
    /(?:hero|layout|modal|settings|dashboard|omnidash)\.[a-z0-9_.-]+|⟦missing:|Missing translation:/i
  );
  await expect(
    page.locator(".pill, .btn").filter({ hasText: /^\s*$/ })
  ).toHaveCount(0);
  await expect(
    page.locator("h1, h2, h3, label").filter({ hasText: /^\s*$/ })
  ).toHaveCount(0);
  const blankPlaceholders = await page
    .locator("input[placeholder=''], textarea[placeholder='']")
    .count();
  expect(blankPlaceholders).toBe(0);
}

test.describe.serial("public language switcher", () => {
  for (const locale of locales) {
    test(`translates public routes and persists ${locale.code}`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.goto("/");
      await selectLocale(page, locale.label);

      await expect(page.getByText(locale.label).first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
      await expect(
        page.getByText(locale.hero, { exact: false }).first()
      ).toBeVisible();
      await expect
        .poll(async () =>
          page.evaluate(() => localStorage.getItem("apex_locale"))
        )
        .toBe(locale.code);

      await page.reload();
      await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
      await expect(page.getByText(locale.label).first()).toBeVisible();

      for (const route of translatedPublicRoutes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.locator("html")).toHaveAttribute("lang", locale.code);
        await expect(page.locator("body")).not.toHaveText(/^\s*$/);
        await expectNoI18nLeaks(page);
      }

      for (const route of staticPublicRoutes) {
        const response = await page.goto(route, { waitUntil: "domcontentloaded" });
        expect(response?.ok()).toBe(true);
      }

      await page.goto("/");
      await page.locator('[data-modal="request-access"]').first().click();
      await expect(page.locator(".modal-card").first()).toBeVisible();
      await expectNoI18nLeaks(page);
    });
  }
});
