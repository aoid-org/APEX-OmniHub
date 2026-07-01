type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

import WebSocket from 'ws';

export async function assertWsConnects(url: string, token: string, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    const timer = setTimeout(() => { ws.close(); reject(new Error(`WS connect timeout after ${timeoutMs}ms`)); }, timeoutMs);
    ws.on('open', () => { clearTimeout(timer); ws.close(); resolve(); });
    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function decodeWsMessage(msg: unknown): string {
  if (Array.isArray(msg)) return Buffer.concat(msg).toString('utf8');
  if (Buffer.isBuffer(msg)) return msg.toString('utf8');
  if (msg instanceof ArrayBuffer) return Buffer.from(msg).toString('utf8');
  return String(msg);
}

export async function waitForTelemetryEvent(url: string, pred: (e: JsonValue) => boolean, token: string, timeoutMs: number): Promise<JsonValue> {
  return new Promise<JsonValue>((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    const timer = setTimeout(() => { ws.close(); reject(new Error(`No matching WS event within ${timeoutMs}ms`)); }, timeoutMs);
    ws.on('message', (msg) => {
      try {
        const payload = decodeWsMessage(msg);
        const evt: JsonValue = JSON.parse(payload) as JsonValue;
        if (pred(evt)) { clearTimeout(timer); ws.close(); resolve(evt); }
      } catch { /* ignore non-json */ }
    });
    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}
