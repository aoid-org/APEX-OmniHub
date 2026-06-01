import { test, expect } from '@playwright/test';

test.describe('Marketing Visuals and Stability', () => {
  test('Language selector is compact icon-only on desktop', async ({ page }) => {
    await page.goto('/');
    
    // The desktop nav should have a compact language selector trigger
    const langTrigger = page.locator('nav .language-selector__trigger').first();
    await expect(langTrigger).toBeVisible();
    
    // Check computed styles or bounding box
    const box = await langTrigger.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(Math.round(box.width)).toBe(44);
      expect(Math.round(box.height)).toBe(44);
    }
  });

  test('Request Early Access and Watch Demo are equal size', async ({ page }) => {
    await page.goto('/');
    
    // Ensure both buttons exist in the hero CTAs
    const requestAccess = page.locator('.hero-ctas a:has-text("Request Early Access")').first();
    const watchDemo = page.locator('.hero-ctas a:has-text("Watch Demo")').first();
    
    await expect(requestAccess).toBeVisible();
    await expect(watchDemo).toBeVisible();
    
    const reqBox = await requestAccess.boundingBox();
    const watchBox = await watchDemo.boundingBox();
    
    expect(reqBox).not.toBeNull();
    expect(watchBox).not.toBeNull();
    
    if (reqBox && watchBox) {
      // Must be roughly equal width (allow 1-2px rounding differences)
      expect(Math.abs(reqBox.width - watchBox.width)).toBeLessThan(2);
    }
  });

  test('Demo video plays', async ({ page }) => {
    await page.goto('/');
    
    const video = page.locator('.landing-root video').first();
    await expect(video).toBeVisible();
    
    // Has source
    const src = await video.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).toContain('apex-demo-video.mp4');
  });

  test('Brand anthem plays after user click', async ({ page }) => {
    await page.goto('/');
    
    const anthemPlayer = page.locator('.brand-anthem-player').first();
    await expect(anthemPlayer).toBeVisible();
    
    const playBtn = page.locator('button[aria-label="Play brand anthem"]').first();
    await expect(playBtn).toBeVisible();
    
    // Click play
    await playBtn.click();
    
    // Button should become active
    await expect(playBtn).toHaveClass(/active/);
  });

  test('Feature pages render under clean and .html routes', async ({ page }) => {
    // Check /demo
    let response = await page.goto('/demo');
    expect(response?.status()).toBe(200);
    
    // Check /demo.html
    response = await page.goto('/demo.html');
    expect(response?.status()).toBe(200);
    
    // Check /fortress
    response = await page.goto('/fortress');
    expect(response?.status()).toBe(200);
    
    // Check /fortress.html
    response = await page.goto('/fortress.html');
    expect(response?.status()).toBe(200);
  });
});
