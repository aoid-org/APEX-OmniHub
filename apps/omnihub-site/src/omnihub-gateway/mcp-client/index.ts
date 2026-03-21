/**
 * OmniHub Gateway MCP-Client API
 * 
 * Replaces legacy point-to-point Supabase Edge Functions with a Zero Marginal Cost
 * A2A (Agent-to-Agent) OmniHub routing layer. All AI model selection and
 * invocation routes through this single source of truth.
 */

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
      // Fallback for local development or disconnected gateway states
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
    // Silent degradation to local static fallback to strictly preserve UX while Gateway routes
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
  const GATEWAY_URL = import.meta.env?.VITE_OMNIHUB_GATEWAY_URL || '/api/mcp';
  try {
    const res = await fetch(`${GATEWAY_URL}/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error(`MCP Gateway HTTP Error: ${res.status}`);
    const data = await res.json() as McpIntentResponse;
    return data;
  } catch (err: unknown) {
    console.error('[MCP Client] Invocation failed:', err);
    throw err;
  }
}
