export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue | undefined };

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response: Response): Promise<JsonValue> {
  return response.json().catch(() => ({}));
}

export async function sendOmniPortCommand<T extends JsonValue = JsonObject>(base: string, body: JsonObject, token: string, timeoutMs: number): Promise<T> {
  const json = await fetchWithTimeout(
    `${base}/api/omniport/command`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) },
    timeoutMs,
  ).then(async (res) => {
    const parsed = await readJson(res);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(parsed)}`);
    return parsed;
  });

  return json as T;
}

export async function fetchSbblLiveAccess<T extends JsonValue = JsonObject>(base: string, gameId: string, token: string, timeoutMs: number): Promise<T> {
  const res = await fetchWithTimeout(`${base}/api/live-access?gameId=${encodeURIComponent(gameId)}`, { headers: { Authorization: `Bearer ${token}` } }, timeoutMs);
  return readJson(res) as Promise<T>;
}

export async function redeemSbblAccessCode<T extends JsonValue = JsonObject>(base: string, accessCode: string, gameId: string, token: string, timeoutMs: number): Promise<T> {
  const res = await fetchWithTimeout(
    `${base}/api/redeem-access-code`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ accessCode, gameId }) },
    timeoutMs,
  );
  return readJson(res) as Promise<T>;
}

export async function fetchOmniHubTelemetry<T extends JsonValue = JsonObject>(base: string, token: string, timeoutMs: number): Promise<T> {
  const res = await fetchWithTimeout(`${base}/api/telemetry/snapshot`, { headers: { Authorization: `Bearer ${token}` } }, timeoutMs);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return readJson(res) as Promise<T>;
}
