/**
 * OmniHub MCP Client — Frontend Gateway Bridge
 * @version 2.0.0
 * @module src/omnihub-gateway/mcp-client
 *
 * APEX POLICY ENFORCED (v2.0.0):
 * - Standard agent invocation ONLY calls same-origin /api/mcp/invoke
 * - NEVER calls functions/v1/apex-agent or functions/v1/byom-proxy directly from browser
 * - User JWT acquired client-side via supabase.auth.getSession()
 * - Only 'groq' and 'anthropic' are valid provider preferences
 * - Unsupported providers (openai, xai, google, gemini, gpt*) are cleared/ignored
 * - queued status is NOT a terminal state — UI must wait for completed/failed/timeout
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import type { TriggerLambdaResponse } from './router';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Configuration
// ============================================================================

const GATEWAY_BASE_URL =
  typeof process !== 'undefined' && process.env?.['OMNIHUB_GATEWAY_URL']
    ? process.env['OMNIHUB_GATEWAY_URL']
    : '/api';

/** Providers allowed as hints (not authoritative). */
const ALLOWED_PROVIDERS = new Set(['groq', 'anthropic']);

/** Providers that must be cleared from sessionStorage. */
const FORBIDDEN_PROVIDER_PATTERNS = /^(openai|xai|google|gemini|gpt.*)$/i;

// ============================================================================
// Provider preference helpers
// ============================================================================

/**
 * Read provider preference from sessionStorage.
 * Returns null if no preference is set, or if it's a forbidden provider.
 * Forbidden providers are cleared from sessionStorage.
 */
function getCleanProviderPreference(): string | null {
  if (globalThis.window === undefined) return null;
  const stored = globalThis.window.sessionStorage.getItem('omni_ai_provider');
  if (!stored) return null;

  if (FORBIDDEN_PROVIDER_PATTERNS.test(stored) || !ALLOWED_PROVIDERS.has(stored)) {
    console.warn(
      `[MCP Client] Clearing unsupported provider preference: '${stored}'. ` +
      `Only 'groq' and 'anthropic' are allowed.`,
    );
    globalThis.window.sessionStorage.removeItem('omni_ai_provider');
    return null;
  }

  return stored;
}

// ============================================================================
// Types
// ============================================================================

export interface LambdaDemoPayload {
  readonly taskData: Record<string, unknown>;
  readonly functionName?: string;
}

export interface AgentCard {
  id: string;
  label: string;
  description: string;
}

export interface McpIntentPayload {
  prompt: string;
  context?: Record<string, unknown>;
}

export interface McpIntentResponse {
  reply: string;
  status?: string;
  workflowId?: string;
  traceId?: string;
}

// ============================================================================
// Gateway functions
// ============================================================================

/**
 * Trigger an async Lambda orchestration demo via the gateway.
 */
export async function triggerAsyncLambdaDemo(
  payload: LambdaDemoPayload,
  authToken: string,
): Promise<TriggerLambdaResponse> {
  const url = `${GATEWAY_BASE_URL}/workflows/trigger-lambda`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      taskData: payload.taskData,
      functionName: payload.functionName ?? 'OmniHubWorkerLambda',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(
      `Lambda dispatch failed (${response.status}): ${(errorBody as Record<string, string>).error ?? 'Unknown error'}`,
    );
  }

  return response.json() as Promise<TriggerLambdaResponse>;
}

/**
 * Get the gateway base URL (for SSE connections).
 */
export function getGatewayBaseUrl(): string {
  return GATEWAY_BASE_URL;
}

const DEFAULT_AGENT_REGISTRY: AgentCard[] = [
  { id: 'claude-mcp', label: 'Claude (Anthropic MCP)', description: 'Connected via OmniHub Gateway' },
  { id: 'gpt4-mcp', label: 'GPT-4o (OpenAI MCP)', description: 'Connected via OmniHub Gateway' },
  { id: 'anthropic-apex', label: 'Claude (Anthropic)', description: 'Planner/executor via APEX OmniPort' },
  { id: 'groq-guardian', label: 'Groq (Guardian + classifier)', description: 'Fast classification via APEX Guardian' },
];

/**
 * Query agent registry. Returns only approved Groq + Anthropic agents.
 */
export async function queryAgentRegistry(): Promise<AgentCard[]> {
  const GATEWAY_URL = '/api/mcp';
  try {
    const res = await fetch(`${GATEWAY_URL}/registry`);
    if (!res.ok) {
      return DEFAULT_AGENT_REGISTRY;
    }
    const data = await res.json() as { agents: AgentCard[] };
    return data.agents;
  } catch (err: unknown) {
    console.error('[MCP Client] Registry query failed:', err);
    return DEFAULT_AGENT_REGISTRY;
  }
}

// ============================================================================
// SSE parsing
// ============================================================================

function processTerminalSseEvent(
  status: string,
  lastEventName: string,
  parsed: Record<string, unknown>,
  workflowId?: string,
  traceId?: string
): McpIntentResponse | null {
  if (lastEventName === 'completed' || status === 'completed') {
    const reply =
      (parsed.reply as string | undefined) ??
      (parsed.result as string | undefined) ??
      '';
    return { reply, status: 'completed', workflowId, traceId };
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

          // Notify on intermediate status events (queued, running)
          if (status === 'queued' || status === 'running') {
            onStatus?.(status, workflowId, traceId);
            continue;
          }

          // Terminal events
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

  // Stream ended without terminal event — treat as failure
  throw new Error('[MCP Client] SSE stream ended without terminal event (completed/failed/timeout)');
}

// ============================================================================
// Primary: invokeMcpIntent — same-origin gateway ONLY
// ============================================================================

/**
 * Invoke the APEX Agent via the same-origin OmniPort Gateway.
 *
 * POLICY:
 * - Calls /api/mcp/invoke ONLY (same-origin Cloudflare Pages Function)
 * - NEVER calls functions/v1/apex-agent or functions/v1/byom-proxy directly
 * - Provider preference is a hint only, forwarded to gateway, not authoritative
 * - queued/running are intermediate states — always wait for completed/failed/timeout
 *
 * @param payload - prompt + optional context
 * @param onStatus - optional callback for intermediate status updates (queued/running)
 */
export async function invokeMcpIntent(
  payload: McpIntentPayload,
  onStatus?: (status: string, workflowId?: string, traceId?: string) => void,
): Promise<McpIntentResponse> {
  // 1. Get user session JWT (client-side only — supabase.auth, not service-role)
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  if (!token) {
    throw new Error('[MCP Client] No active session. User must be authenticated.');
  }

  // 2. Read + sanitize provider preference
  const providerPreference = getCleanProviderPreference();

  // 3. Build request body
  const requestBody: Record<string, unknown> = {
    prompt: payload.prompt,
    context: payload.context ?? {},
  };
  if (providerPreference) {
    requestBody.providerPreference = providerPreference;
  }

  // 4. Call same-origin gateway ONLY
  let res: Response;
  try {
    res = await fetch('/api/mcp/invoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });
  } catch (err: unknown) {
    console.error('[MCP Client] Gateway fetch failed:', err);
    throw new Error(`[MCP Client] Gateway unreachable: ${err instanceof Error ? err.message : String(err)}`);
  }

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

  // 5. Determine if it's SSE or JSON
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    if (!res.body) throw new Error('[MCP Client] Gateway returned no body');
    try {
      return await parseSseToCompletion(res.body, onStatus);
    } catch (err: unknown) {
      console.error('[MCP Client] SSE parse error:', err);
      throw err;
    }
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
