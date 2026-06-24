/**
 * OmniPort Gateway smoke test.
 *
 * Tests the real production path:
 *   Browser → /api/mcp/invoke → apex-agent → orchestrator → agent_runs
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... E2E_USER_EMAIL=... PASSWORD=...
 *   bun run scripts/test-gateway.ts
 *
 * Fails if:
 *   - Authentication fails
 *   - /api/mcp/invoke does not return text/event-stream
 *   - No terminal SSE event (completed|failed) arrives within 90 s
 *   - Terminal event is "timeout"
 *   - Response contains the OmniSlate generic system error string
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;
const TEST_EMAIL = process.env.E2E_USER_EMAIL;
const TEST_PASSWORD = process.env.PASSWORD;

// Production domain — the gateway lives on Pages, not on Supabase
const PRODUCTION_GATEWAY_URL = process.env.GATEWAY_URL ?? 'https://apexomnihub.icu';
const GATEWAY_SENTINEL = '[System Error]: Failed to contact APEX Agent';

async function testGateway(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
    console.error(
      'Missing credentials. Required env vars: ' +
        'SUPABASE_URL (or VITE_SUPABASE_URL), ' +
        'SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY), ' +
        'E2E_USER_EMAIL, PASSWORD',
    );
    process.exit(1);
  }

  // ── 1. Authenticate with Supabase to get a valid JWT ────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Logging into Supabase to acquire JWT...');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError || !authData.session) {
    console.error('Authentication failed:', authError?.message);
    process.exit(1);
  }

  const jwt = authData.session.access_token;
  console.log('✓ Authenticated. JWT acquired.');

  // ── 2. Call /api/mcp/invoke — same-origin gateway (NOT /functions/v1/apex-agent) ─
  const invokeUrl = `${PRODUCTION_GATEWAY_URL}/api/mcp/invoke`;
  console.log(`\nPOST ${invokeUrl}`);

  const payload = {
    prompt: 'HELLO — OmniPort Gateway smoke test. Reply with: GATEWAY_SMOKE_OK',
    context: { source: 'smoke-test' },
  };

  let response: Response;
  try {
    response = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('❌ FAILED: fetch exception:', err);
    process.exit(1);
  }

  console.log(`Response status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const body = await response.text();
    console.error(`❌ FAILED: Gateway returned ${response.status}: ${body}`);
    process.exit(1);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    const body = await response.text();
    console.error(`❌ FAILED: Expected text/event-stream, got "${contentType}". Body: ${body}`);
    process.exit(1);
  }

  console.log('✓ Received SSE stream. Reading events...');

  // ── 3. Read SSE until terminal event or client-side timeout ─────────────────
  const TIMEOUT_MS = 95_000; // slightly over the server 90s
  const deadline = Date.now() + TIMEOUT_MS;

  const reader = response.body?.getReader();
  if (!reader) {
    console.error('❌ FAILED: Response body is not readable');
    process.exit(1);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let lastEvent = '';
  let lastData: Record<string, unknown> = {};
  let terminalEvent: string | null = null;

  outer: while (Date.now() < deadline) {
    const timeLeft = deadline - Date.now();
    const readPromise = reader.read();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('read_timeout')), Math.min(timeLeft, 5_000)),
    );

    let done: boolean;
    let value: Uint8Array | undefined;
    try {
      ({ done, value } = await Promise.race([
        readPromise,
        timeoutPromise,
      ]));
    } catch {
      console.log('  (read timed out — checking deadline)');
      continue;
    }

    if (done) break;
    if (value) {
      buffer += decoder.decode(value, { stream: true });
    }

    // Parse complete SSE messages from buffer
    const messages = buffer.split('\n\n');
    buffer = messages.pop() ?? '';

    for (const msg of messages) {
      if (!msg.trim()) continue;

      for (const line of msg.split('\n')) {
        if (line.startsWith('event: ')) {
          lastEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          try {
            lastData = JSON.parse(line.slice(6)) as Record<string, unknown>;
          } catch {
            lastData = { raw: line.slice(6) };
          }
        }
      }

      console.log(`  SSE: ${lastEvent} → ${JSON.stringify(lastData)}`);

      if (lastEvent === 'completed' || lastEvent === 'failed' || lastEvent === 'timeout') {
        terminalEvent = lastEvent;
        break outer;
      }
    }
  }

  reader.cancel().catch(() => {});

  // ── 4. Validate terminal event ───────────────────────────────────────────────
  console.log('');

  if (!terminalEvent) {
    console.error('❌ FAILED: No terminal SSE event received within timeout.');
    process.exit(1);
  }

  if (terminalEvent === 'timeout') {
    console.error(`❌ FAILED: Terminal event was "timeout". Server-side timeout exceeded.`);
    process.exit(1);
  }

  const dataStr = JSON.stringify(lastData);
  if (dataStr.includes(GATEWAY_SENTINEL)) {
    console.error(`❌ FAILED: Response contains OmniSlate system error string.`);
    console.error(`  Data: ${dataStr}`);
    process.exit(1);
  }

  if (terminalEvent === 'completed') {
    const reply = lastData.reply as string | undefined;
    if (!reply || reply.length === 0) {
      console.error('❌ FAILED: "completed" event has empty reply field.');
      process.exit(1);
    }
    console.log(`✅ SUCCESS: Terminal event = "completed"`);
    console.log(`   reply: ${reply}`);
    console.log(`   traceId: ${lastData.traceId}`);
  } else if (terminalEvent === 'failed') {
    // "failed" is acceptable as a terminal event (agent ran but workflow failed)
    // but we must distinguish from a gateway infrastructure failure
    const error = lastData.error as string | undefined;
    if (error === 'agent_run_insert_failed' || error === 'internal_gateway_error') {
      console.error(`❌ FAILED: Gateway infrastructure error: ${error}`);
      process.exit(1);
    }
    console.log(`⚠️  Terminal event = "failed" (workflow failed, not gateway infrastructure).`);
    console.log(`   error: ${error}`);
    console.log(`   This may be expected if the orchestrator is not running in this environment.`);
  }
}

try {
  await testGateway();
} catch (err: unknown) {
  console.error('❌ Unhandled exception in testGateway:', err);
  process.exit(1);
}
