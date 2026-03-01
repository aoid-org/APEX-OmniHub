import { test, expect } from '@playwright/test';

/**
 * Visual Regression Tests for Homepage
 * Compares rendered homepage against reference mockups at exact viewports
 */

test.describe('Homepage Visual Regression', () => {

    test('White Fortress (light theme) - 1024x1536', async ({ page }) => {
        // Set theme before navigation
        await page.addInitScript(() => {
            localStorage.setItem('theme', 'light');
        });

        // Set viewport to match light mockup
        await page.setViewportSize({ width: 1024, height: 1536 });

        // Navigate and wait for content
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Wait for hero visual animation to settle
        await page.waitForTimeout(1000);

        // Full page screenshot comparison
        await expect(page).toHaveScreenshot('home-light.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
            animations: 'disabled',
        });
    });

    test('Night Watch (dark theme) - 1196x2048', async ({ page }) => {
        // Set theme before navigation
        await page.addInitScript(() => {
            localStorage.setItem('theme', 'dark');
        });

        // Set viewport to match dark mockup
        await page.setViewportSize({ width: 1196, height: 2048 });

        // Navigate and wait for content
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Wait for hero visual animation to settle
        await page.waitForTimeout(1000);

        // Full page screenshot comparison
        await expect(page).toHaveScreenshot('home-night.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
            animations: 'disabled',
        });
    });

    test('Theme toggle works correctly', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Default should be light
        const html = page.locator('html');
        await expect(html).toHaveAttribute('data-theme', 'light');

        // Click Night Watch button
        await page.click('text=NIGHT WATCH');
        await expect(html).toHaveAttribute('data-theme', 'dark');

        // Verify localStorage
        const theme = await page.evaluate(() => localStorage.getItem('theme'));
        expect(theme).toBe('dark');

        // Click White Fortress button
        await page.click('text=WHITE FORTRESS');
        await expect(html).toHaveAttribute('data-theme', 'light');
    });
});

test.describe('Responsive i18n Regression', () => {

    test('Mobile 375x812 — no horizontal scroll, no overlap', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

        await expect(page).toHaveScreenshot('home-mobile-375.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
            animations: 'disabled',
        });
    });

    test('Tablet 768x1024 — no horizontal scroll, no overlap', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

        await expect(page).toHaveScreenshot('home-tablet-768.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
            animations: 'disabled',
        });
    });

    test('Desktop 1440x900 — no horizontal scroll, no overlap', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

        await expect(page).toHaveScreenshot('home-desktop-1440.png', {
            fullPage: true,
            maxDiffPixelRatio: 0.02,
            animations: 'disabled',
        });
    });
});

