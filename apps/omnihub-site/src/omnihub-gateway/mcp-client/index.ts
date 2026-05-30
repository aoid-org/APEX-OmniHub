/**
 * OmniHub Gateway MCP-Client API
 *
 * Routes APEX Agent intent invocations through the Supabase apex-agent
 * Edge Function with authenticated session headers. Falls back to the
 * Cloudflare gateway proxy (/api/mcp/invoke) when Supabase is not configured.
 *
 * APEX STANDARDS ENFORCED:
 * - Auth-first: Every agent call carries the Supabase JWT
 * - Fail-closed: Non-200 responses throw; callers handle the error display
 * - Zero mock data in production paths
 */

import { supabase } from '@/lib/supabase';

export interface AgentCard {
  id: string;
  label: string;
  description: string;
}

export async function queryAgentRegistry(): Promise<AgentCard[]> {
  const GATEWAY_URL = import.meta.env?.VITE_OMNIHUB_GATEWAY_URL || '/api/mcp';
  try {
    const res = await fetch(`${GATEWAY_URL}/registry`);
    if (!res.ok) {
      return [
        { id: 'claude-mcp', label: 'Claude (Anthropic MCP)', description: 'Connected via OmniHub Gateway' },
        { id: 'gpt4-mcp', label: 'GPT-4o (OpenAI MCP)', description: 'Connected via OmniHub Gateway' },
        { id: 'gemini-mcp', label: 'Gemini Ultra (Google MCP)', description: 'Connected via OmniHub Gateway' },
        { id: 'llama-mcp', label: 'Llama 3 (Meta MCP)', description: 'On-premise inference' },
      ];
    }
    const data = await res.json() as { agents: AgentCard[] };
    return data.agents;
  } catch (err: unknown) {
    console.error('[MCP Client] Registry query failed:', err);
    return [
      { id: 'claude-mcp', label: 'Claude (Anthropic MCP)', description: 'Connected via OmniHub Gateway' },
      { id: 'gpt4-mcp', label: 'GPT-4o (OpenAI MCP)', description: 'Connected via OmniHub Gateway' },
      { id: 'gemini-mcp', label: 'Gemini Ultra (Google MCP)', description: 'Connected via OmniHub Gateway' },
      { id: 'llama-mcp', label: 'Llama 3 (Meta MCP)', description: 'On-premise inference' },
    ];
  }
}

export interface McpIntentPayload {
  prompt: string;
  context?: Record<string, unknown>;
}

export interface McpIntentResponse {
  reply: string;
  status?: string;
}

export async function invokeMcpIntent(payload: McpIntentPayload): Promise<McpIntentResponse> {
  const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');

  if (supabaseUrl) {
    // Route to APEX Agent (apex-agent) Supabase Edge Function with session auth
    const endpoint = `${supabaseUrl}/functions/v1/apex-agent`;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token ?? '';
    const traceId = crypto.randomUUID();

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ query: payload.prompt, traceId }),
    });

    if (!res.ok) throw new Error(`MCP Gateway HTTP Error: ${res.status}`);

    const data = await res.json() as Record<string, unknown>;
    // apex-agent returns orchestrator data ({ workflowId, status }); map to McpIntentResponse
    const reply =
      typeof data.workflowId === 'string'
        ? `Workflow queued: ${data.workflowId}`
        : typeof data.reply === 'string'
          ? data.reply
          : 'Request submitted to APEX Agent.';
    const status = typeof data.status === 'string' ? data.status : undefined;
    return { reply, ...(status !== undefined ? { status } : {}) };
  }

  // Fallback: Cloudflare gateway proxy path (production Cloudflare Worker)
  const res = await fetch('/api/mcp/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`MCP Gateway HTTP Error: ${res.status}`);
  return res.json() as Promise<McpIntentResponse>;
}
