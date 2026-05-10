import { test, expect } from '../fixtures';
import { sendOmniPortCommand } from '../helpers/api-client';

const OMNIPORT_URL = process.env.OMNIPORT_URL || process.env.SBBL_URL || 'http://localhost:8787';

test.describe('03 — OmniPort Command Round-Trip', () => {
  test('authenticated command acknowledged', async ({ adminToken }) => {
    const response = await sendOmniPortCommand(OMNIPORT_URL, { command: 'PING', targetApp: 'sbbl-hq', data: { source: 'integration-harness', timestamp: Date.now() } }, adminToken, 8000);
    expect(response.success).toBe(true);
  });
  test('invalid command rejected', async ({ adminToken }) => {
    const res = await fetch(`${OMNIPORT_URL}/api/omniport/command`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ command: '__INVALID_COMMAND_THAT_DOES_NOT_EXIST__', targetApp: 'sbbl-hq' }) });
    expect(res.status).toBeGreaterThanOrEqual(400); expect(res.status).toBeLessThan(500);
  });
  test('unauthenticated command rejected', async () => {
    const res = await fetch(`${OMNIPORT_URL}/api/omniport/command`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'PING', targetApp: 'sbbl-hq' }) });
    expect(res.status).toBe(401);
  });
});
