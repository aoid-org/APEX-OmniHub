/**
 * POST /api/mcp/invoke
 *
 * Forwards an MCP intent to the OmniHub Gateway.  In production the
 * VITE_OMNIHUB_GATEWAY_URL env-var routes to the real service; this
 * stub provides a local-dev fallback so the front-end never 404s.
 */

import type { McpIntentPayload, McpIntentResponse } from '../../omnihub-gateway/mcp-client/index';

export function handleInvokeRequest(payload: McpIntentPayload): Response {
  const response: McpIntentResponse = {
    reply: `[local-dev stub] Received prompt: "${payload.prompt.slice(0, 80)}"`,
    status: 'stub',
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
