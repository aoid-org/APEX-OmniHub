import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function assertPlatformMapSplit(page: Page) {
  const host = page.locator('#platform-map');
  const inner = host.locator('.ohsm-inner');
  const copy = inner.locator('.ohsm-copy');
  const stage = inner.locator('.ohsm-stage-3d');
  const canvas = stage.locator('canvas.ohsm-hero-3d');

  await expect(inner).toHaveCount(1);
  await expect(copy).toHaveCount(1);
  await expect(stage).toHaveCount(1);
  await expect(canvas).toHaveCount(1);
  await expect(copy).toContainText('Every capability.');

  const metrics = await inner.evaluate((node) => {
    const host = document.querySelector('#platform-map') as HTMLElement;
    const copy = node.querySelector('.ohsm-copy') as HTMLElement;
    const stage = node.querySelector('.ohsm-stage-3d') as HTMLElement;
    const canvas = stage.querySelector('canvas.ohsm-hero-3d') as HTMLCanvasElement;
    const innerStyle = getComputedStyle(node as HTMLElement);
    const copyBox = copy.getBoundingClientRect();
    const stageBox = stage.getBoundingClientRect();
    const canvasBox = canvas.getBoundingClientRect();
    const hostBox = host.getBoundingClientRect();

    return {
      columns: innerStyle.gridTemplateColumns,
      copyLeft: copyBox.left,
      copyRight: copyBox.right,
      stageLeft: stageBox.left,
      stageTop: stageBox.top,
      copyTop: copyBox.top,
      stageWidth: stageBox.width,
      stageHeight: stageBox.height,
      canvasParentClass: canvas.parentElement?.className || '',
      canvasWidth: canvasBox.width,
      canvasHeight: canvasBox.height,
      hostWidth: hostBox.width,
    };
  });

  expect(metrics.canvasParentClass).toContain('ohsm-stage-3d');
  expect(metrics.stageWidth).toBeGreaterThan(0);
  expect(metrics.stageHeight).toBeGreaterThan(0);
  expect(metrics.canvasWidth).toBeGreaterThan(0);
  expect(metrics.canvasHeight).toBeGreaterThan(0);

  return metrics;
}

test.describe('platform map split hero', () => {
  test('desktop mounts 3D canvas inside a right-side split stage', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const metrics = await assertPlatformMapSplit(page);

    expect(metrics.columns.split(' ').length).toBeGreaterThanOrEqual(2);
    expect(metrics.copyLeft).toBeLessThan(metrics.stageLeft);
    expect(metrics.copyRight).toBeLessThanOrEqual(metrics.stageLeft);
    expect(metrics.stageWidth).toBeGreaterThan(metrics.hostWidth * 0.35);
  });

  test('tablet and mobile collapse safely while preserving stage reservation', async ({ page }) => {
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const metrics = await assertPlatformMapSplit(page);

      if (viewport.width < 900) {
        expect(Math.abs(metrics.stageLeft - metrics.copyLeft)).toBeLessThan(2);
        expect(metrics.stageTop).toBeLessThan(metrics.copyTop);
      } else {
        expect(metrics.columns.split(' ').length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});
