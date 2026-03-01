import { test, expect, Page } from '@playwright/test';

/**
 * Visual Regression Tests for Homepage
 * Compares rendered homepage against reference mockups at exact viewports
 */

interface ScreenshotTestConfig {
    theme: 'light' | 'dark';
    width: number;
    height: number;
    snapshotName: string;
}

interface ResponsiveTestConfig {
    width: number;
    height: number;
    snapshotName: string;
}

async function captureThemeScreenshot(page: Page, config: ScreenshotTestConfig) {
    await page.addInitScript((theme) => {
        localStorage.setItem('theme', theme);
    }, config.theme);

    await page.setViewportSize({ width: config.width, height: config.height });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot(config.snapshotName, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
    });
}

async function captureResponsiveScreenshot(page: Page, config: ResponsiveTestConfig) {
    await page.setViewportSize({ width: config.width, height: config.height });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

    await expect(page).toHaveScreenshot(config.snapshotName, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        animations: 'disabled',
    });
}

test.describe('Homepage Visual Regression', () => {

    test('White Fortress (light theme) - 1024x1536', async ({ page }) => {
        await captureThemeScreenshot(page, {
            theme: 'light',
            width: 1024,
            height: 1536,
            snapshotName: 'home-light.png',
        });
    });

    test('Night Watch (dark theme) - 1196x2048', async ({ page }) => {
        await captureThemeScreenshot(page, {
            theme: 'dark',
            width: 1196,
            height: 2048,
            snapshotName: 'home-night.png',
        });
    });

    test('Theme toggle works correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const html = page.locator('html');
        await expect(html).toHaveAttribute('data-theme', 'light');

        await page.click('text=NIGHT WATCH');
        await expect(html).toHaveAttribute('data-theme', 'dark');

        const theme = await page.evaluate(() => localStorage.getItem('theme'));
        expect(theme).toBe('dark');

        await page.click('text=WHITE FORTRESS');
        await expect(html).toHaveAttribute('data-theme', 'light');
    });
});

test.describe('Responsive i18n Regression', () => {

    test('Mobile 375x812 — no horizontal scroll, no overlap', async ({ page }) => {
        await captureResponsiveScreenshot(page, {
            width: 375,
            height: 812,
            snapshotName: 'home-mobile-375.png',
        });
    });

    test('Tablet 768x1024 — no horizontal scroll, no overlap', async ({ page }) => {
        await captureResponsiveScreenshot(page, {
            width: 768,
            height: 1024,
            snapshotName: 'home-tablet-768.png',
        });
    });

    test('Desktop 1440x900 — no horizontal scroll, no overlap', async ({ page }) => {
        await captureResponsiveScreenshot(page, {
            width: 1440,
            height: 900,
            snapshotName: 'home-desktop-1440.png',
        });
    });
});
