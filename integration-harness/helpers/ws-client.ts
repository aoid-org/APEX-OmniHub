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

export async function waitForTelemetryEvent(url: string, pred: (e: JsonValue) => boolean, token: string, timeoutMs: number): Promise<JsonValue> {
  return new Promise<JsonValue>((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    const timer = setTimeout(() => { ws.close(); reject(new Error(`No matching WS event within ${timeoutMs}ms`)); }, timeoutMs);
    ws.on('message', (msg) => {
      try {
        const payload = Array.isArray(msg) ? Buffer.concat(msg).toString('utf8') : Buffer.isBuffer(msg) ? msg.toString('utf8') : msg instanceof ArrayBuffer ? Buffer.from(msg).toString('utf8') : String(msg);
        const evt: JsonValue = JSON.parse(payload) as JsonValue;
        if (pred(evt)) { clearTimeout(timer); ws.close(); resolve(evt); }
      } catch { /* ignore non-json */ }
    });
    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}
