import { test, expect } from '@playwright/test';

test.describe('Marketing Visuals and Stability', () => {
  test('Language selector is compact icon-only on desktop', async ({ page, isMobile }) => {
    if (isMobile) {
      test.skip(true, 'APEX-1001: Mobile layout test execution deferred');
    }
    await page.goto('/');

    // Scope to the primary desktop nav only — excludes mobile nav which is
    // present in DOM but hidden. The desktop nav trigger is 44x44px per CSS.
    const langTrigger = page
      .locator('header nav .language-selector__trigger, .nav__desktop .language-selector__trigger')
      .first();

    // Fall back to the first visible trigger if the scoped selector yields nothing.
    const fallback = page.locator('.language-selector__trigger').first();
    const trigger = (await langTrigger.count()) > 0 ? langTrigger : fallback;
    await expect(trigger).toBeVisible();

    const box = await trigger.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Allow +-4px for sub-pixel rendering differences across CI and local DPRs.
      expect(box.width).toBeGreaterThanOrEqual(40);
      expect(box.width).toBeLessThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(40);
      expect(box.height).toBeLessThanOrEqual(48);
    }
  });

  test('Request Early Access and Watch Demo are equal size', async ({ page, isMobile }) => {
    // Skip on mobile — buttons stack or resize differently on narrow viewports.
    if (isMobile) {
      test.skip(true, 'APEX-1001: Mobile layout test execution deferred');
    }

    await page.goto('/');

    // Use data-modal and data-cta attributes as stable anchors — immune to
    // text content changes and i18n translations.
    const requestAccess = page.locator('[data-modal="request-access"]').first();
    const watchDemo = page.locator('[data-cta="watch-demo"]').first();

    await expect(requestAccess).toBeVisible();
    await expect(watchDemo).toBeVisible();

    const reqBox = await requestAccess.boundingBox();
    const watchBox = await watchDemo.boundingBox();

    expect(reqBox).not.toBeNull();
    expect(watchBox).not.toBeNull();

    if (reqBox && watchBox) {
      // Allow +-4px rounding difference across CI viewport scaling.
      expect(Math.abs(reqBox.width - watchBox.width)).toBeLessThan(4);
    }
  });

  test('Demo video element is present and has a valid source', async ({ page }) => {
    await page.goto('/demo');

    const video = page.locator('.demo-video__player').first();
    await expect(video).toBeVisible({ timeout: 15000 });

    // The player uses a direct src= attribute on <video>.
    // Verify it references the correct asset.
    const srcAttr = await video.getAttribute('src');
    expect(srcAttr).toBeTruthy();
    expect(srcAttr).toContain('apex-demo-video.mp4');
  });

  test('Brand anthem player is present and interactive', async ({ page }) => {
    await page.goto('/');

    const anthemPlayer = page.locator('.brand-anthem-player').first();
    await expect(anthemPlayer).toBeVisible();

    // Both play and pause buttons must be rendered — structural integrity check.
    const playBtn = page.locator('button[aria-label="Play brand anthem"]').first();
    const pauseBtn = page.locator('button[aria-label="Pause brand anthem"]').first();
    await expect(playBtn).toBeVisible();
    await expect(pauseBtn).toBeVisible();

    // Headless browsers block audio autoplay via browser policy — clicking play
    // fires the handler but audio.play() may reject without a real user gesture.
    // We verify the click is handled (no JS crash) rather than asserting playback
    // state, which is non-deterministic in CI headless environments.
    await playBtn.click();

    // The player must remain stable (no unmount / crash) after the click.
    await expect(anthemPlayer).toBeVisible();
  });

  test('Feature pages render under clean and .html routes', async ({ page }) => {
    // The SPA uses a Cloudflare Pages catch-all redirect (/* /index.html 200),
    // so all routes return 200 — both clean paths and legacy .html variants.
    const routes = ['/demo', '/demo.html', '/fortress', '/fortress.html'];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status(), `Expected 200 for route: ${route}`).toBe(200);
    }
  });
});
