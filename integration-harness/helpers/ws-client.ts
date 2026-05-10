import WebSocket, { type RawData } from 'ws';
import type { JsonObject, JsonValue } from './api-client';

function parseWsEvent(message: RawData): JsonObject | null {
  try {
    const parsed = JSON.parse(message.toString()) as JsonValue;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    // Preserve existing behavior by ignoring non-JSON websocket messages.
  }
  return null;
}

export async function assertWsConnects(url: string, token: string, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    const timer = setTimeout(() => { ws.close(); reject(new Error(`WS connect timeout after ${timeoutMs}ms`)); }, timeoutMs);
    ws.on('open', () => { clearTimeout(timer); ws.close(); resolve(); });
    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

export async function waitForTelemetryEvent(url: string, pred: (event: JsonObject) => boolean, token: string, timeoutMs: number): Promise<JsonObject> {
  return new Promise<JsonObject>((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    const timer = setTimeout(() => { ws.close(); reject(new Error(`No matching WS event within ${timeoutMs}ms`)); }, timeoutMs);
    ws.on('message', (msg: RawData) => {
      const evt = parseWsEvent(msg);
      if (evt && pred(evt)) { clearTimeout(timer); ws.close(); resolve(evt); }
    });
    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}
