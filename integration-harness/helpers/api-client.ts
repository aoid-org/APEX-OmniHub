type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

export async function sendOmniPortCommand(base: string, body: Record<string, unknown>, token: string, timeoutMs: number): Promise<JsonValue> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  const res = await fetch(`${base}/api/omniport/command`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: ctl.signal });
  clearTimeout(t);
  const json: JsonValue = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

export async function fetchSbblLiveAccess(base: string, gameId: string, token: string, timeoutMs: number): Promise<JsonValue> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
  const res = await fetch(`${base}/api/live-access?gameId=${encodeURIComponent(gameId)}`, { headers: { Authorization: `Bearer ${token}` }, signal: ctl.signal });
  clearTimeout(t); return res.json();
}
export async function redeemSbblAccessCode(base: string, accessCode: string, gameId: string, token: string, timeoutMs: number): Promise<JsonValue> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
  const res = await fetch(`${base}/api/redeem-access-code`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ accessCode, gameId }), signal: ctl.signal });
  clearTimeout(t); return res.json();
}
export async function fetchOmniHubTelemetry(base: string, token: string, timeoutMs: number): Promise<JsonValue> {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeoutMs);
  const res = await fetch(`${base}/api/telemetry/snapshot`, { headers: { Authorization: `Bearer ${token}` }, signal: ctl.signal });
  clearTimeout(t);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}
