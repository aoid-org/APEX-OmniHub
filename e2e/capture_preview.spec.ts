import { test } from '@playwright/test';

test('capture omnidash in dark mode', async ({ page }) => {
  // Set viewport for a good desktop preview
  await page.setViewportSize({ width: 1440, height: 900 });

  // Navigate to OmniDash Integrations
  await page.goto('http://localhost:8080/integrations', { waitUntil: 'networkidle' });
  
  // Force dark mode via localStorage
  await page.evaluate(() => {
    localStorage.setItem('theme', 'dark'); // try next-themes standard
    localStorage.setItem('vite-ui-theme', 'dark');
    document.documentElement.classList.add('dark');
  });
  
  // Reload to apply the local storage correctly if needed
  await page.reload({ waitUntil: 'networkidle' });

  // Wait a moment for any entrance animations to complete
  await page.waitForTimeout(2000);

  // Capture screenshot directly to the artifacts directory
  const outputPath = 'C:/Users/sinyo/.gemini/antigravity/brain/ec876978-e545-4a99-bcf0-52658ad91665/real_omnidash_preview_dark.png';
  await page.screenshot({ path: outputPath, fullPage: true });
});
