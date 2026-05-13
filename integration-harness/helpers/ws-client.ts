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
    ws.on('message', (msg: any) => {
      try {
        let msgStr = '';
        if (typeof msg === 'string') {
          msgStr = msg;
        } else if (Buffer.isBuffer(msg)) {
          msgStr = msg.toString('utf8');
        } else if (Array.isArray(msg)) {
          msgStr = Buffer.concat(msg).toString('utf8');
        } else if (msg instanceof ArrayBuffer) {
          msgStr = Buffer.from(msg).toString('utf8');
        } else {
          throw new Error('Unsupported message type');
        }
        const evt: JsonValue = JSON.parse(msgStr) as JsonValue;
        if (pred(evt)) { clearTimeout(timer); ws.close(); resolve(evt); }
      } catch { /* ignore non-json */ }
    });
    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}
