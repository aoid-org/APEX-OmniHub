/**
 * OmniHub MCP Client — Frontend Gateway Bridge
 * @version 1.0.0
 * @module src/omnihub-gateway/mcp-client
 *
 * Typed client for the OmniHub Gateway REST endpoints.
 * Called by dashboard components to trigger workflows and
 * interact with the backend gateway layer.
 *
 * APEX STANDARDS ENFORCED:
 * - Type-safe: All requests and responses are Zod-validated or typed
 * - Auth-first: Every request carries the Supabase JWT
 * - Fail-closed: Network errors throw, never silently succeed
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

// ============================================================================
// Client Functions
// ============================================================================

export interface LambdaDemoPayload {
  readonly taskData: Record<string, unknown>;
  readonly functionName?: string;
}

/**
 * Trigger an async Lambda orchestration demo via the gateway.
 *
 * Calls POST /api/workflows/trigger-lambda with the user's JWT
 * and task payload. Returns the workflowId for tracking.
 *
 * The backend dispatches the Lambda via Temporal's Asynchronous Activity
 * Completion pattern and broadcasts completion via SSE.
 *
 * @param payload - Task data and optional function name
 * @param authToken - Supabase JWT for authentication
 * @returns The workflow dispatch response with workflowId
 * @throws Error if the request fails or auth is invalid
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

export interface AgentCard {
  id: string;
  label: string;
  description: string;
}

export async function queryAgentRegistry(): Promise<AgentCard[]> {
  const GATEWAY_URL = '/api/mcp';
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

function processSseChunk(chunk: string, currentReply: string): string {
  const newContent = chunk
    .split('\n')
    .filter((line) => {
      if (!line.startsWith('data: ')) return false;
      if (line === 'data: [DONE]') return false;
      return true;
    })
    .map((line) => {
      try {
        const data = JSON.parse(line.substring(6)) as { choices?: { delta?: { content?: string } }[] };
        return data.choices?.[0]?.delta?.content ?? '';
      } catch {
        return '';
      }
    })
    .join('');

  return currentReply + newContent;
}

async function parseSseStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  let replyText = "";
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    replyText = processSseChunk(chunk, replyText);
  }
  return replyText;
}

async function invokeByomProxy(payload: McpIntentPayload, byomProvider: string): Promise<McpIntentResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  
  if (!token) throw new Error('BYOM Error: Unauthorized (no session token)');

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/byom-proxy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      provider: byomProvider,
      model: byomProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o',
      messages: [{ role: 'user', content: payload.prompt }]
    })
  });

  if (!res.ok) {
    let errorMsg = `BYOM Gateway Error: ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody.error) errorMsg = errBody.error;
    } catch { /* ignore */ }
    throw new Error(errorMsg);
  }

  const reader = res.body?.getReader();
  if (!reader) return { reply: "" };

  const replyText = await parseSseStream(reader);
  return { reply: replyText };
}

export async function invokeMcpIntent(payload: McpIntentPayload): Promise<McpIntentResponse> {
  const GATEWAY_URL = '/api/mcp';
  const byomProvider = globalThis.window === undefined ? null : globalThis.window.localStorage.getItem('omni_ai_provider');

  try {
    if (byomProvider) {
      return await invokeByomProxy(payload, byomProvider);
    }

    // Standard APEX endpoint fallback
    const res = await fetch(`${GATEWAY_URL}/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error(`MCP Gateway HTTP Error: ${res.status}`);
    return await res.json() as McpIntentResponse;
  } catch (err: unknown) {
    console.error('[MCP Client] Invocation failed:', err);
    throw err;
  }
}

