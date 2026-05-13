with open("integration-harness/helpers/ws-client.ts", "r") as f:
    content = f.read()

# Let's revert back to how it was essentially before but simply cast nicely, or use the Data type ws provides
# In the original file: ws.on('message', (msg) => {
# Since we have implicit any warning we need to type `msg`.
# `WebSocket.Data` is the standard type from 'ws' library

new_content = """type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

import WebSocket from 'ws';

export async function assertWsConnects(url: string, token: string, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    const timer = setTimeout(() => { ws.close(); reject(new Error(`WS connect timeout after ${timeoutMs}ms`)); }, timeoutMs);
    ws.on('open', () => { clearTimeout(timer); ws.close(); resolve(); });
    ws.on('error', (err: Error) => { clearTimeout(timer); reject(err); });
  });
}

export async function waitForTelemetryEvent(url: string, pred: (e: JsonValue) => boolean, token: string, timeoutMs: number): Promise<JsonValue> {
  return new Promise<JsonValue>((resolve, reject) => {
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    const timer = setTimeout(() => { ws.close(); reject(new Error(`No matching WS event within ${timeoutMs}ms`)); }, timeoutMs);
    ws.on('message', (msg: WebSocket.RawData) => {
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
          msgStr = String(msg);
        }
        const evt: JsonValue = JSON.parse(msgStr) as JsonValue;
        if (pred(evt)) { clearTimeout(timer); ws.close(); resolve(evt); }
      } catch { /* ignore non-json */ }
    });
    ws.on('error', (err: Error) => { clearTimeout(timer); reject(err); });
  });
}
"""

with open("integration-harness/helpers/ws-client.ts", "w") as f:
    f.write(new_content)

print("Patched ws-client.ts fully")
