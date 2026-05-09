import { test, expect } from '../fixtures';
import { waitForTelemetryEvent, assertWsConnects } from '../helpers/ws-client';
import WebSocket from 'ws';

const WS_URL = process.env.OMNIHUB_WS_URL || 'ws://localhost:5173/ws/telemetry';

test.describe('02 — OmniHub Telemetry WebSocket', () => {
  test('WS endpoint accepts authenticated connection', async ({ adminToken }) => {
    await assertWsConnects(WS_URL, adminToken, 10000);
  });
  test('WS messages include typed events', async ({ adminToken }) => {
    const event = await waitForTelemetryEvent(WS_URL, (e) => typeof e.type === 'string' && e.type.length > 0, adminToken, 12000);
    expect(event.type).toBeTruthy();
  });
  test('unauthenticated WS connection is rejected', async () => {
    const rejected = await new Promise<boolean>((resolve) => {
      const ws = new WebSocket(WS_URL); const t = setTimeout(() => { ws.close(); resolve(false); }, 5000);
      ws.on('close', () => { clearTimeout(t); resolve(true); }); ws.on('error', () => { clearTimeout(t); resolve(true); });
    });
    expect(rejected).toBe(true);
  });
});
