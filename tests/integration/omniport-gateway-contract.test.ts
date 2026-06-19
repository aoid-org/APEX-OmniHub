/**
 * OmniPort Gateway — agent_runs contract regression tests
 * @module tests/integration/omniport-gateway-contract
 *
 * Locks the production invocation contract for functions/api/mcp/invoke.ts
 * against the canonical agent_runs migration
 * (supabase/migrations/20251221000001_omnilink_ops_pack.sql).
 *
 * Two layers:
 *  1. Static source invariants — fail if the insert reintroduces `query` /
 *     `queued`, or if polling selects columns that do not exist.
 *  2. Behavioral — drive onRequestPost end-to-end with a mocked Supabase REST
 *     surface and assert the SSE stream completes with a non-empty reply built
 *     from `agent_response`.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { onRequestPost } from '../../functions/api/mcp/invoke';

const INVOKE_SRC_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../functions/api/mcp/invoke.ts',
);
const SRC = readFileSync(INVOKE_SRC_PATH, 'utf8');

const BANNED_POLL_COLUMNS = ['reply', 'result', 'error', 'workflow_id', 'completed_at'];

/** Extract the agent_runs INSERT body object literal (the first agent_runs POST). */
function extractInsertBody(src: string): string {
  const m = src.match(/agent_runs`[\s\S]*?body:\s*JSON\.stringify\((\{[\s\S]*?\})\)/);
  if (!m) throw new Error('Could not locate agent_runs insert body in invoke.ts');
  return m[1];
}

/** Extract the agent_runs poll select column list. */
function extractPollSelect(src: string): string[] {
  const m = src.match(/agent_runs\?[^`]*select=([a-zA-Z0-9_,]+)/);
  if (!m) throw new Error('Could not locate agent_runs poll select in invoke.ts');
  return m[1].split(',');
}

// ============================================================================
// 1. Static source invariants
// ============================================================================

describe('OmniPort gateway — agent_runs insert contract (static)', () => {
  const insertBody = extractInsertBody(SRC);

  it('inserts thread_id, status=running, and user_message (migration schema)', () => {
    expect(insertBody).toMatch(/thread_id:\s*traceId/);
    expect(insertBody).toMatch(/status:\s*"running"/);
    expect(insertBody).toMatch(/user_message:\s*prompt/);
  });

  it('does NOT insert the non-existent `query` column', () => {
    expect(insertBody).not.toMatch(/\bquery\s*:/);
  });

  it('does NOT insert DB status `queued` (constraint forbids it)', () => {
    expect(insertBody).not.toMatch(/status:\s*"queued"/);
  });
});

describe('OmniPort gateway — agent_runs poll contract (static)', () => {
  const selected = extractPollSelect(SRC);

  it('selects exactly the migration-defined columns', () => {
    expect(selected).toEqual([
      'id',
      'status',
      'agent_response',
      'error_message',
      'end_time',
      'metadata',
    ]);
  });

  it.each(BANNED_POLL_COLUMNS)('does NOT select non-existent column `%s`', (col) => {
    // Exact-token match — `error_message` must NOT trip the `error` check.
    expect(selected).not.toContain(col);
  });
});

// ============================================================================
// 2. Behavioral — full SSE drive of onRequestPost
// ============================================================================

const SUPABASE_URL = 'https://stub.supabase.local';

interface FetchCall {
  url: string;
  method: string;
  body?: string;
}

/** Read an SSE ReadableStream into an array of { event, data } records. */
async function drainSse(res: Response): Promise<Array<{ event: string; data: any }>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const events: Array<{ event: string; data: any }> = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split('\n\n');
    buf = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const evLine = chunk.match(/^event:\s*(.+)$/m);
      const dataLine = chunk.match(/^data:\s*(.+)$/m);
      if (evLine && dataLine) {
        events.push({ event: evLine[1].trim(), data: JSON.parse(dataLine[1]) });
      }
    }
  }
  return events;
}

function makeRequest(prompt: string): Request {
  return new Request('https://apexomnihub.icu/api/mcp/invoke', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-jwt',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, context: { source: 'contract-test' } }),
  });
}

describe('OmniPort gateway — behavioral SSE completion', () => {
  afterEach(() => vi.restoreAllMocks());

  it('completes with a non-empty reply built from JSON agent_response', async () => {
    const calls: FetchCall[] = [];

    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input: any, init?: any): Promise<Response> => {
        const url = typeof input === 'string' ? input : input.url;
        const method = (init?.method ?? 'GET').toUpperCase();
        calls.push({ url, method, body: init?.body });

        // 1. agent_runs INSERT (POST)
        if (url.includes('/rest/v1/agent_runs') && method === 'POST') {
          return new Response(null, { status: 201 });
        }
        // 2. apex-agent handoff
        if (url.includes('/functions/v1/apex-agent')) {
          return new Response(JSON.stringify({ workflowId: 'goal-abc', status: 'started' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        // 3. agent_runs poll (GET) — terminal completed row
        if (url.includes('/rest/v1/agent_runs') && method === 'GET') {
          return new Response(
            JSON.stringify([
              {
                id: 'row-id',
                status: 'completed',
                agent_response: JSON.stringify({
                  status: 'success',
                  goal: 'hello',
                  steps_executed: 1,
                }),
                error_message: null,
                end_time: new Date().toISOString(),
                metadata: { workflow_id: 'goal-abc' },
              },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }
        throw new Error(`Unexpected fetch: ${method} ${url}`);
      },
    );

    const env = { SUPABASE_URL, SUPABASE_ANON_KEY: 'anon-stub' };
    const res = await onRequestPost({ request: makeRequest('hello'), env } as any);
    expect(res.headers.get('Content-Type')).toContain('text/event-stream');

    const events = await drainSse(res);
    const completed = events.find((e) => e.event === 'completed');
    expect(completed, 'must emit a terminal completed event').toBeTruthy();
    expect(typeof completed!.data.reply).toBe('string');
    expect(completed!.data.reply.length).toBeGreaterThan(0);
    expect(completed!.data.reply).not.toContain('[object Object]');
    // Parsed result is surfaced for downstream consumers.
    expect(completed!.data.result).toMatchObject({ status: 'success', goal: 'hello' });

    // The insert payload must carry the migration columns, never `query`.
    const insert = calls.find((c) => c.url.includes('/rest/v1/agent_runs') && c.method === 'POST');
    expect(insert?.body).toContain('thread_id');
    expect(insert?.body).toContain('"status":"running"');
    expect(insert?.body).not.toContain('"query"');
  });

  it('emits a terminal failed event when the insert fails (no silent swallow)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async (input: any, init?: any): Promise<Response> => {
        const url = typeof input === 'string' ? input : input.url;
        const method = (init?.method ?? 'GET').toUpperCase();
        if (url.includes('/rest/v1/agent_runs') && method === 'POST') {
          return new Response('{"code":"42501","message":"rls"}', { status: 403 });
        }
        throw new Error(`Unexpected fetch: ${method} ${url}`);
      },
    );

    const env = { SUPABASE_URL, SUPABASE_ANON_KEY: 'anon-stub' };
    const res = await onRequestPost({ request: makeRequest('hello'), env } as any);
    const events = await drainSse(res);
    const failed = events.find((e) => e.event === 'failed');
    expect(failed, 'insert failure must surface as failed').toBeTruthy();
    expect(failed!.data.error).toBe('agent_run_insert_failed');
  });
});
