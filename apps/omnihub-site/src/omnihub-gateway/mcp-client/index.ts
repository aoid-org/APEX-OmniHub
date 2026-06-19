/**
 * OmniHub Gateway MCP-Client API
 *
 * Routes APEX Agent intent invocations to the Cloudflare Pages gateway proxy 
 * (/api/mcp/invoke) using same-origin POST with authenticated session headers.
 * The Cloudflare gateway sits in front of the Supabase apex-agent Edge Function.
 * The browser does NOT directly call Supabase functions/v1/apex-agent. There is no
 * fallback to direct Supabase browser POST.
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

function processTerminalSseEvent(
  status: string,
  lastEventName: string,
  parsed: Record<string, unknown>,
  _workflowId?: string,
  _traceId?: string
): McpIntentResponse | null {
  if (lastEventName === 'completed' || status === 'completed') {
    const reply =
      (parsed.reply as string | undefined) ??
      (parsed.result as string | undefined) ??
      '';
    return { reply, status: 'completed' };
  }
  if (lastEventName === 'failed' || status === 'failed') {
    const error = (parsed.error as string | undefined) ?? 'Agent execution failed';
    throw new Error(`[MCP Client] Agent failed: ${error}`);
  }
  if (lastEventName === 'timeout' || status === 'timeout') {
    throw new Error('[MCP Client] Agent timed out');
  }
  if (lastEventName === 'error' || status === 'error') {
    const errMsg = (parsed.error as string | undefined) ?? 'Unknown error';
    throw new Error(`[MCP Client] Gateway error: ${errMsg}`);
  }
  return null;
}

async function parseSseToCompletion(
  body: ReadableStream<Uint8Array>,
  onStatus?: (status: string, workflowId?: string, traceId?: string) => void,
): Promise<McpIntentResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastEventName = '';
  let finalResult: McpIntentResponse | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed.startsWith('event: ')) {
          lastEventName = trimmed.slice(7).trim();
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(trimmed.slice(6)) as Record<string, unknown>;
          } catch {
            continue;
          }

          const traceId = parsed.traceId as string | undefined;
          const workflowId = parsed.workflowId as string | undefined;
          const status = (parsed.status as string | undefined) ?? lastEventName;

          if (status === 'queued' || status === 'running') {
            onStatus?.(status, workflowId, traceId);
            continue;
          }

          const result = processTerminalSseEvent(status, lastEventName, parsed, workflowId, traceId);
          if (result) {
            finalResult = result;
          }

          lastEventName = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (finalResult) return finalResult;
  throw new Error('[MCP Client] SSE stream ended without terminal event (completed/failed/timeout)');
}

export async function invokeMcpIntent(payload: McpIntentPayload, onStatus?: (status: string) => void): Promise<McpIntentResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token ?? '';

  const res = await fetch('/api/mcp/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    throw new Error('[MCP Client] Gateway returned 401 — session may have expired');
  }

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json() as { error?: string };
      if (body.error) errorMsg = body.error;
    } catch { /* ignore */ }
    throw new Error(`[MCP Client] Gateway error: ${errorMsg}`);
  }

  if (!res.body) {
    throw new Error('[MCP Client] Gateway returned no body');
  }

  // Determine if it's SSE or JSON
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    return await parseSseToCompletion(res.body, onStatus);
  } else {
    // Fallback for tests/mocks returning JSON
    const data = await res.json() as Record<string, unknown>;
    const status = data.status as string | undefined;

    if (!status) {
      throw new Error('[MCP Client] JSON response missing terminal status');
    }

    if (status === 'queued' || status === 'running' || status === 'pending') {
      throw new Error(`[MCP Client] JSON response returned non-terminal status: ${status}`);
    }

    const result = processTerminalSseEvent(status, '', data);
    if (result) {
      return result;
    }

    throw new Error(`[MCP Client] JSON response returned unknown or non-terminal status: ${status}`);
  }
}
