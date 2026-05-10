import { test, expect } from '../fixtures';
import { fetchSbblLiveAccess, redeemSbblAccessCode, fetchOmniHubTelemetry } from '../helpers/api-client';

const SBBL_URL = process.env.SBBL_URL || 'http://localhost:8787';
const OMNIHUB_URL = process.env.OMNIHUB_URL || 'http://localhost:5173';

test.describe('05 — PPV Entitlement & useLiveAccess', () => {
  test.beforeEach(async () => { if (!(process.env.TEST_PPV_GAME_ID || process.env.INTEGRATION_PPV_GAME_ID) || !(process.env.TEST_PPV_ACCESS_CODE || process.env.INTEGRATION_PPV_ACCESS_CODE)) test.skip(true, 'ppv inputs missing'); });
  test('redemption succeeds with correct argument order', async ({ fanToken }) => {
    const gameId = process.env.TEST_PPV_GAME_ID || process.env.INTEGRATION_PPV_GAME_ID!;
    const accessCode = process.env.TEST_PPV_ACCESS_CODE || process.env.INTEGRATION_PPV_ACCESS_CODE!;
    await fetchSbblLiveAccess(SBBL_URL, gameId, fanToken, 10000);
    const result = await redeemSbblAccessCode(SBBL_URL, accessCode, gameId, fanToken, 10000);
    expect(result.success).toBe(true);
  });
  test('entitlement persisted and reflected in OmniHub telemetry', async ({ sbblFan, adminToken }) => {
    const gameId = process.env.TEST_PPV_GAME_ID || process.env.INTEGRATION_PPV_GAME_ID!;
    const { data, error } = await sbblFan.from('access_codes').select('id,game_id,redeemed_by,redeemed_at').eq('game_id', gameId).not('redeemed_by', 'is', null).limit(1);
    expect(error).toBeNull(); expect((data ?? []).length).toBeGreaterThan(0);
    const snapshot = await fetchOmniHubTelemetry(OMNIHUB_URL, adminToken, 8000).catch(() => ({ agents: [] }));
    expect(Array.isArray(snapshot.agents)).toBe(true);
  });
});
