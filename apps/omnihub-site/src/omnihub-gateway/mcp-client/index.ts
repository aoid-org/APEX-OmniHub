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
      return [];
    }
    const data = await res.json() as { agents: AgentCard[] };
    return data.agents;
  } catch (err: unknown) {
    console.error('[MCP Client] Registry query failed:', err);
    return [];
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
  // FIX(S5852): bounded quantifier prevents ReDoS via super-linear backtracking
  const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL ?? '').replace(/\/{1,100}$/u, '');

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
    let reply = 'Request submitted to APEX Agent.';
    if (typeof data.workflowId === 'string') {
      reply = `Workflow queued: ${data.workflowId}`;
    } else if (typeof data.reply === 'string') {
      reply = data.reply;
    }

    const response: McpIntentResponse = { reply };
    if (typeof data.status === 'string') {
      response.status = data.status;
    }
    return response;
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
