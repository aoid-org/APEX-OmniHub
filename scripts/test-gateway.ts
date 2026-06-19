/**
 * OmniPort Gateway — production smoke test
 *
 * Exercises the REAL browser-equivalent invocation path:
 *   Supabase auth → POST https://apexomnihub.icu/api/mcp/invoke (same-origin)
 *   → SSE stream → terminal `completed` | `failed` | `timeout`.
 *
 * This does NOT call /functions/v1/apex-agent directly — that bypasses the
 * Cloudflare Pages gateway, RLS, agent_runs insert/poll, and SSE contract that
 * production OmniSlate actually depends on.
 *
 * Required .env: SUPABASE_URL (or VITE_SUPABASE_URL), SUPABASE_ANON_KEY
 * (or VITE_SUPABASE_ANON_KEY), E2E_USER_EMAIL, PASSWORD.
 * Optional: GATEWAY_INVOKE_URL (defaults to production).
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.E2E_USER_EMAIL;
const TEST_PASSWORD = process.env.PASSWORD;
const GATEWAY_INVOKE_URL =
  process.env.GATEWAY_INVOKE_URL || 'https://apexomnihub.icu/api/mcp/invoke';

// The exact failure string OmniSlate renders when the gateway path is broken.
const OMNISLATE_SYSTEM_ERROR =
  '[System Error]: Failed to contact APEX Agent. Guardian audit logged.';

const TERMINAL_EVENTS = new Set(['completed', 'failed', 'timeout']);

interface SseEvent {
  event: string;
  data: Record<string, unknown>;
}

function fail(msg: string): never {
  console.error(`❌ FAILED: ${msg}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
    fail(
      'Missing credentials in .env. Required: SUPABASE_URL, SUPABASE_ANON_KEY, E2E_USER_EMAIL, PASSWORD.',
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Authenticating test user with Supabase...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (authError || !authData.session) {
    fail(`Failed to authenticate test user: ${authError?.message ?? 'no session'}`);
  }
  const token = authData.session.access_token;
  console.log('Authenticated. JWT acquired.');

  console.log(`POST ${GATEWAY_INVOKE_URL} (same-origin gateway path)...`);
  const response = await fetch(GATEWAY_INVOKE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt: 'HELLO', context: { source: 'smoke-test' } }),
  });

  console.log('Response status:', response.status, response.statusText);
  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok) {
    fail(`Gateway returned non-200: ${response.status} — ${await response.text()}`);
  }
  if (!contentType.includes('text/event-stream')) {
    fail(`Expected text/event-stream, got "${contentType}". Body: ${await response.text()}`);
  }

  // ── Read SSE until a terminal event ───────────────────────────────────────
  const reader = response.body?.getReader();
  if (!reader) fail('No response body stream.');
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let raw = '';
  let terminal: SseEvent | null = null;

  outer: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    raw += text;
    buffer += text;

    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const evMatch = block.match(/^event:\s*(.+)$/m);
      const dataMatch = block.match(/^data:\s*(.+)$/m);
      if (!evMatch) continue;
      const event = evMatch[1].trim();
      let data: Record<string, unknown> = {};
      if (dataMatch) {
        try {
          data = JSON.parse(dataMatch[1]);
        } catch {
          /* tolerate non-JSON keepalive */
        }
      }
      console.log(`  SSE event: ${event} ${JSON.stringify(data)}`);
      if (TERMINAL_EVENTS.has(event)) {
        terminal = { event, data };
        break outer;
      }
    }
  }

  // ── Assertions ────────────────────────────────────────────────────────────
  if (raw.includes(OMNISLATE_SYSTEM_ERROR)) {
    fail(`Response contained the OmniSlate generic system error.`);
  }
  if (!terminal) {
    fail('Stream ended with no terminal event (completed | failed | timeout).');
  }
  if (terminal.event === 'timeout') {
    fail('Gateway timed out before reaching completed/failed.');
  }
  if (terminal.event === 'failed') {
    fail(`Gateway returned terminal failure: ${JSON.stringify(terminal.data)}`);
  }

  // completed
  const reply = terminal.data.reply;
  if (typeof reply !== 'string' || reply.length === 0) {
    fail(`Completed event missing a non-empty reply: ${JSON.stringify(terminal.data)}`);
  }
  console.log(`\n✅ SUCCESS: gateway completed with reply: "${reply}"`);
}

main().catch((err) => fail(`Unhandled exception: ${err instanceof Error ? err.message : err}`));
