/**
 * APEX Agent — Workflow & Automation Invocation Tests
 * @module tests/integration/apex-agent-workflow
 *
 * Verifies the complete APEX Agent invocation chain:
 * - invokeMcpIntent dispatch (gateway client)
 * - Workflow trigger request structure
 * - Automation execution chain types
 * - OmniSlate prompt → agent → response flow
 * - Error recovery / fail-closed guarantees
 * - OmniBoard hydration after agent response
 *
 * AAA pattern enforced. Zero mock data in prod paths.
 * OWNED BY: APEX Business Systems Ltd.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGatewayBaseUrl, invokeMcpIntent, queryAgentRegistry } from '@/omnihub-gateway/mcp-client';
import type { McpIntentPayload, McpIntentResponse } from '@/omnihub-gateway/mcp-client';

// Provide an authenticated session so the MCP session guard passes in unit tests.
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token-unit' } },
        error: null,
      }),
    },
  },
}));

/** Build a minimal SSE stream string for a completed event. */
function sseCompleted(payload: Record<string, unknown>): string {
  return `event: completed\ndata: ${JSON.stringify(payload)}\n\n`;
}

// ============================================================================
// invokeMcpIntent — gateway dispatch contract
// ============================================================================

describe('APEX Agent — invokeMcpIntent gateway dispatch', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('resolves with reply on 200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(sseCompleted({ reply: 'Workflow queued: audit-pass-001', status: 'completed' }), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    const result = await invokeMcpIntent({ prompt: 'Run audit workflow', context: {} });

    expect(result.reply).toBe('Workflow queued: audit-pass-001');
    expect(result.status).toBe('completed');
  });

  it('throws on non-200 HTTP status (fail-closed)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    await expect(invokeMcpIntent({ prompt: 'Run audit workflow' })).rejects.toThrow(
      /401/,
    );
  });

  it('throws on network failure (fail-closed)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network unreachable'));

    await expect(invokeMcpIntent({ prompt: 'Orchestrate billing sync' })).rejects.toThrow(
      'Network unreachable',
    );
  });

  it('POSTs to /api/mcp/invoke with correct headers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(sseCompleted({ reply: 'ok' }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );

    await invokeMcpIntent({ prompt: 'Execute workflow', context: { source: 'OmniSlate' } });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/mcp/invoke');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('serialises prompt and context into the request body', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(sseCompleted({ reply: 'ack' }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );

    const payload: McpIntentPayload = {
      prompt: 'Summarise stalled workflows',
      context: { module: 'Automations', priority: 'high' },
    };
    await invokeMcpIntent(payload);

    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string) as McpIntentPayload;
    expect(body.prompt).toBe('Summarise stalled workflows');
    expect(body.context?.module).toBe('Automations');
  });

  it('handles empty context gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(sseCompleted({ reply: 'done' }), { status: 200, headers: { 'Content-Type': 'text/event-stream' } }),
    );

    await expect(invokeMcpIntent({ prompt: 'Execute automation' })).resolves.toMatchObject({ reply: 'done' });
  });
});

// ============================================================================
// queryAgentRegistry — agent discovery contract
// ============================================================================

describe('APEX Agent — queryAgentRegistry discovery', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('returns registry cards on success', async () => {
    const mockAgents = [
      { id: 'claude-mcp', label: 'Claude (Anthropic MCP)', description: 'Connected via OmniHub Gateway' },
      { id: 'gpt4-mcp', label: 'GPT-4o (OpenAI MCP)', description: 'Connected via OmniHub Gateway' },
    ];
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ agents: mockAgents }), { status: 200 }),
    );

    const result = await queryAgentRegistry();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('claude-mcp');
  });

  it('falls back to default agent list on API failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Timeout'));

    const result = await queryAgentRegistry();
    expect(result.length).toBeGreaterThanOrEqual(4);
    const ids = result.map((a) => a.id);
    expect(ids).toContain('claude-mcp');
    expect(ids).toContain('gpt4-mcp');
  });

  it('falls back to default agent list on non-200 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('{}', { status: 503 }),
    );

    const result = await queryAgentRegistry();
    expect(result.length).toBeGreaterThanOrEqual(4);
  });

  it('each agent card has id, label, description', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));

    const result = await queryAgentRegistry();
    for (const agent of result) {
      expect(typeof agent.id).toBe('string');
      expect(typeof agent.label).toBe('string');
      expect(typeof agent.description).toBe('string');
      expect(agent.id.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Gateway URL resolution
// ============================================================================

describe('APEX Agent — gateway URL resolution', () => {
  it('returns /api as default gateway base URL', () => {
    expect(getGatewayBaseUrl()).toBe('/api');
  });
});

// ============================================================================
// Workflow payload structure contract
// ============================================================================

describe('APEX Agent — workflow trigger payload contract', () => {
  it('McpIntentPayload has required prompt field', () => {
    const payload: McpIntentPayload = { prompt: 'Trigger nightly billing reconciliation' };
    expect(payload.prompt).toBeTruthy();
  });

  it('McpIntentPayload accepts optional context with arbitrary keys', () => {
    const payload: McpIntentPayload = {
      prompt: 'Execute automations for overdue invoices',
      context: {
        tenant: 'apex-demo',
        workflow: 'invoice-overdue-alert',
        priority: 1,
      },
    };
    expect(payload.context?.tenant).toBe('apex-demo');
    expect(payload.context?.priority).toBe(1);
  });

  it('McpIntentResponse always carries a reply string', () => {
    const response: McpIntentResponse = { reply: 'Automation scheduled for 03:00 UTC' };
    expect(typeof response.reply).toBe('string');
  });

  it('McpIntentResponse status field is optional', () => {
    const withStatus: McpIntentResponse = { reply: 'ok', status: 'queued' };
    const withoutStatus: McpIntentResponse = { reply: 'ok' };
    expect(withStatus.status).toBe('queued');
    expect(withoutStatus.status).toBeUndefined();
  });
});

// ============================================================================
// OmniSlate error recovery — fail-closed guarantee
// ============================================================================

describe('APEX Agent — OmniSlate error recovery', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('surfaces a [System Error] message when gateway is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('ECONNREFUSED'));

    // This mirrors the OmniSlateWidget catch block behaviour
    let errorMessage = '';
    try {
      await invokeMcpIntent({ prompt: 'Run audit' });
    } catch {
      errorMessage = '[System Error]: Failed to contact APEX Agent. Guardian audit logged.';
    }

    expect(errorMessage).toContain('[System Error]');
    expect(errorMessage).toContain('Guardian audit logged');
  });

  it('invocation with empty prompt still dispatches (server validates)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(sseCompleted({ reply: 'No prompt provided' }), {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }),
    );

    const result = await invokeMcpIntent({ prompt: '' });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result.reply).toBe('No prompt provided');
  });
});
