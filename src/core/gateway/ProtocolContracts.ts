/**
 * ProtocolContracts — Canonical Gateway/MCP/A2A Contract Helpers
 * @version 1.1.0
 * @updated 2026-05-09
 * @module src/core/gateway/ProtocolContracts
 *
 * Minimal shared contracts for protocol handlers and MCP host discovery.
 * Keeps standards-facing wire shapes open while preserving legacy parsing
 * only at controlled compatibility boundaries.
 */

export const MCP_PROTOCOL_VERSION = '2025-11-25' as const;
export const MCP_LEGACY_PROTOCOL_VERSION = '2025-03-26' as const;

export const SUPPORTED_MCP_PROTOCOL_VERSIONS = [
  MCP_PROTOCOL_VERSION,
  '2025-06-18',
  MCP_LEGACY_PROTOCOL_VERSION,
] as const;

export interface PaginatedList<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
}

export interface MCPListParams {
  readonly cursor?: unknown;
  readonly limit?: unknown;
}

export interface PaginatedMCPList<T> {
  readonly items: readonly T[];
  readonly nextCursor?: string;
}

export interface MCPToolContract {
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly inputSchema?: Record<string, unknown>;
  readonly parameters?: readonly Record<string, unknown>[];
  readonly riskLevel?: string;
}

export interface MCPResourceContract {
  readonly uri: string;
  readonly name?: string;
  readonly title?: string;
  readonly description?: string;
  readonly mimeType?: string;
  readonly size?: number;
}

export interface MCPPromptContract {
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly arguments?: readonly Record<string, unknown>[];
}

export type MCPListKind = 'tools' | 'resources' | 'prompts';

export interface MCPInitializeResult {
  readonly protocolVersion: string;
  readonly capabilities: {
    readonly tools: { readonly listChanged: boolean };
    readonly resources: { readonly subscribe: boolean; readonly listChanged: boolean };
    readonly prompts: { readonly listChanged: boolean };
    readonly logging: Record<string, never>;
  };
  readonly serverInfo: {
    readonly name: string;
    readonly title: string;
    readonly version: string;
    readonly description: string;
  };
  readonly instructions: string;
}

export function negotiateMcpProtocolVersion(requested?: unknown): string {
  if (typeof requested === 'string' && isSupportedMcpProtocolVersion(requested)) {
    return requested;
  }
  return MCP_PROTOCOL_VERSION;
}

export function buildMcpInitializeResult(requested?: unknown): MCPInitializeResult {
  return {
    protocolVersion: negotiateMcpProtocolVersion(requested),
    capabilities: {
      tools: { listChanged: true },
      resources: { subscribe: false, listChanged: true },
      prompts: { listChanged: true },
      logging: {},
    },
    serverInfo: {
      name: 'omnihub-gateway',
      title: 'APEX OmniHub Gateway',
      version: '1.6.0',
      description: 'Governed MCP and A2A interoperability gateway.',
    },
    instructions: 'All tool execution is governed, audited, and correlated by tenant context.',
  };
}

export function wrapMcpListResult<T>(kind: MCPListKind, items: readonly T[], cursor?: unknown) {
  return {
    [kind]: items,
    ...(typeof cursor === 'string' && cursor.length > 0 ? { nextCursor: cursor } : {}),
  };
}

export function paginateMcpList<T>(
  items: readonly T[],
  params: MCPListParams,
  defaultLimit = 100,
): PaginatedMCPList<T> {
  const start = coerceCursorOffset(params.cursor);
  const limit = coerceListLimit(params.limit, defaultLimit);
  const page = items.slice(start, start + limit);
  const nextOffset = start + page.length;

  return {
    items: page,
    ...(nextOffset < items.length ? { nextCursor: String(nextOffset) } : {}),
  };
}

export function unwrapMcpListResult<T>(result: unknown, kind: MCPListKind): PaginatedList<T> {
  if (Array.isArray(result)) {
    return { items: result as T[] };
  }

  if (!isRecord(result)) {
    return { items: [] };
  }

  const maybeItems = result[kind];
  const nextCursor = result['nextCursor'];
  return {
    items: Array.isArray(maybeItems) ? (maybeItems as T[]) : [],
    ...(typeof nextCursor === 'string' && nextCursor.length > 0 ? { nextCursor } : {}),
  };
}

export function deriveTraceMeta(input: {
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly workflowId?: string;
  readonly taskId?: string;
  readonly approvalId?: string;
  readonly artifactIds?: readonly string[];
}) {
  return {
    requestId: input.requestId,
    correlationId: input.correlationId ?? input.requestId,
    workflowId: input.workflowId,
    taskId: input.taskId,
    approvalId: input.approvalId,
    artifactIds: input.artifactIds ?? [],
  };
}

function coerceCursorOffset(cursor: unknown): number {
  if (typeof cursor !== 'string' || cursor.length === 0) {
    return 0;
  }

  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function coerceListLimit(limit: unknown, fallback: number): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) {
    return fallback;
  }

  return Math.max(1, Math.min(Math.floor(limit), 100));
}

function isSupportedMcpProtocolVersion(version: string): boolean {
  return SUPPORTED_MCP_PROTOCOL_VERSIONS.includes(
    version as (typeof SUPPORTED_MCP_PROTOCOL_VERSIONS)[number],
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
