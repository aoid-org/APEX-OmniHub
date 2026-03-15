import { test } from '@playwright/test';
import {
  setupOmnidashContext,
  captureOmnidashScreenshots,
} from './helpers/omnidash-helpers';

// Screenshot-only tests require a stable authenticated preview URL.
// In CI, Supabase is not configured and there is no persistent preview URL,
// so these tests are skipped to avoid false failures.
const isCI = !!process.env.CI;

test.describe('OmniDash UI Screenshots', () => {
  test.skip(isCI, 'Screenshot capture skipped in CI — requires authenticated preview URL');
  test('capture desktop screenshots', async ({ browser }) => {
    const context = await setupOmnidashContext(browser, {
      viewport: { width: 1440, height: 900 },
    });

    await captureOmnidashScreenshots(context, 'desktop');
    await context.close();
  });

  test('capture mobile screenshots', async ({ browser }) => {
    const context = await setupOmnidashContext(browser, {
      viewport: { width: 390, height: 844 },
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    });

    await captureOmnidashScreenshots(context, 'mobile');
    await context.close();
  });
});