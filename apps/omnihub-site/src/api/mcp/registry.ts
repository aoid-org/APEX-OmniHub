/**
 * GET /api/mcp/registry
 *
 * Returns the list of available MCP agents.  In production the
 * VITE_OMNIHUB_GATEWAY_URL env-var points to the real gateway; this
 * stub provides a local-dev fallback so the front-end never 404s.
 */

import type { AgentCard } from '../../omnihub-gateway/mcp-client/index';

const LOCAL_AGENTS: AgentCard[] = [
  { id: 'claude-mcp', label: 'Claude (Anthropic MCP)', description: 'Connected via OmniHub Gateway' },
  { id: 'gpt4-mcp', label: 'GPT-4o (OpenAI MCP)', description: 'Connected via OmniHub Gateway' },
  { id: 'gemini-mcp', label: 'Gemini Ultra (Google MCP)', description: 'Connected via OmniHub Gateway' },
  { id: 'llama-mcp', label: 'Llama 3 (Meta MCP)', description: 'On-premise inference' },
];

export function handleRegistryRequest(): Response {
  return new Response(JSON.stringify({ agents: LOCAL_AGENTS }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
