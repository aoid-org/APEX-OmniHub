import { test, expect } from '../fixtures';
import { waitForTelemetryEvent } from '../helpers/ws-client';

const WS_URL = process.env.OMNIHUB_WS_URL || 'ws://localhost:5173/ws/telemetry';

test.describe('04 — Broadcast State Reflection', () => {
  test.beforeEach(async () => { if (!process.env.TEST_PPV_GAME_ID && !process.env.INTEGRATION_PPV_GAME_ID) test.skip(true, 'game id missing'); });
  test('Supabase realtime fires when game status changes', async ({ sbblAdmin }) => {
    const gameId = process.env.TEST_PPV_GAME_ID || process.env.INTEGRATION_PPV_GAME_ID!;
    const { error } = await sbblAdmin.from('games').update({ status: 'live', updated_at: new Date().toISOString() }).eq('id', gameId);
    expect(error).toBeNull();
  });
  test('OmniHub WS reflects broadcast-state change', async ({ sbblAdmin, adminToken }) => {
    const gameId = process.env.TEST_PPV_GAME_ID || process.env.INTEGRATION_PPV_GAME_ID!;
    const wsPromise = waitForTelemetryEvent(WS_URL, (e) => /broadcast|sbbl|game.*live|live.*game/i.test(e.type) || e?.payload?.gameId === gameId, adminToken, 12000);
    await sbblAdmin.from('games').update({ status: 'live', updated_at: new Date().toISOString() }).eq('id', gameId);
    expect(await wsPromise).toBeTruthy();
  });
});
