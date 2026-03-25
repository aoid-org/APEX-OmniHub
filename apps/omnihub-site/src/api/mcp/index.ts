/**
 * /api/mcp/* — Local-dev API route barrel.
 *
 * Exports the stub handlers that mirror the production OmniHub Gateway
 * so the MCP client in mcp-client/index.ts works out-of-the-box in
 * local development without needing VITE_OMNIHUB_GATEWAY_URL.
 */

export { handleRegistryRequest } from './registry';
export { handleInvokeRequest } from './invoke';
