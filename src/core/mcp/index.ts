/**
 * OmniMCP — Barrel Export
 * @module src/core/mcp
 *
 * Re-exports all MCP framework modules for single-import access.
 */

// Configuration
export {
  MCPConfigSchema,
  MCPServerEntrySchema,
  MCPTransportType,
  MCPCapability,
  getDefaultConfig,
  type MCPConfig,
  type MCPServerEntry,
} from './mcp.config';

// Transport
export {
  JsonRpcRequestSchema,
  JsonRpcResponseSchema,
  StdioTransport,
  StreamableHTTPTransport,
  createTransport,
  type JsonRpcRequest,
  type JsonRpcResponse,
  type MCPTransport,
  type TransportStatus,
} from './MCPTransport';

// Server Registry
export {
  MCPServerRegistry,
  ServerInfoSchema,
  type ServerRegistryEntry,
  type ServerStatus,
  type ServerInfo,
} from './MCPServerRegistry';

// Tool Discovery
export {
  MCPToolDiscovery,
  MCPToolSchemaEntry,
  MCPToolParameterSchema,
  type MCPToolSchema,
  type MCPToolParameter,
} from './MCPToolDiscovery';

// Host Manager (Facade)
export {
  MCPHostManager,
  ToolInvocationSchema,
  type ToolInvocation,
  type ToolResult,
  type ApprovalRequest,
  type ApprovalCallback,
  type AuditEntry,
  type AuditCallback,
  type BridgeRiskLevel,
  type HealthCheckConfig,
  type MCPResource,
  type MCPPrompt,
  resolveBridgeRiskLevel,
} from './MCPHostManager';

// Decomposed Managers (v2.0.0)
export { MCPConnectionManager } from './MCPConnectionManager';
export { MCPSessionManager } from './MCPSessionManager';
export { MCPDispatcher } from './MCPDispatcher';
