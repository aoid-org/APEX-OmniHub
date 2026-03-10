import { test, expect } from "@playwright/test";

test("cold-load /omnidash and reload to verify SPA rewrite avoids 404", async ({
  page,
}) => {
  // Navigate directly to the deep link
  const response = await page.goto("/omnidash");
  expect(response?.status()).not.toBe(404);

  // Reload to verify it still doesn't 404
  const reloadResponse = await page.reload();
  expect(reloadResponse?.status()).not.toBe(404);
});
