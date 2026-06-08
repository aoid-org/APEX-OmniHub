/**
 * ============================================================
 * APEX OmniHub — MCP Gateway
 * ============================================================
 *
 * Remote MCP server implementing the Streamable HTTP transport.
 * Exposes 26 tools across 4 categories:
 *   • Supabase DB operations    (8 tools)
 *   • GitHub repo management    (6 tools)
 *   • Cloudflare deployments    (5 tools)
 *   • OmniHub platform monitor  (7 tools)
 *
 * Authentication: Bearer token via MCP_GATEWAY_API_KEY env var
 *
 * Connector URL (add in Claude → Customize → Connectors):
 *   https://<project>.supabase.co/functions/v1/mcp-gateway
 *
 * Environment variables required:
 *   MCP_GATEWAY_API_KEY        — shared secret for Claude connector
 *   SUPABASE_URL               — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — Supabase service role key
 *   GITHUB_TOKEN               — GitHub PAT for repo tools
 *   CLOUDFLARE_API_TOKEN       — Cloudflare API token
 *   CLOUDFLARE_ACCOUNT_ID      — Cloudflare account ID
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ALL_TOOLS, dispatchTool } from "./tools/registry.ts";

// ──────────────────────────────────────────────────────────────────
// MCP Protocol Constants
// ──────────────────────────────────────────────────────────────────

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "apex-omnihub-gateway", version: "1.0.0" };

// ──────────────────────────────────────────────────────────────────
// CORS — open for Claude to connect from any origin
// ──────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
  "Access-Control-Allow-Headers":
    "authorization, content-type, mcp-session-id, x-api-key",
};

// ──────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Auth — MCP_GATEWAY_API_KEY must match the Bearer token
  if (!isAuthorized(req)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  if (req.method === "POST") {
    return handlePost(req);
  }

  // GET /mcp-gateway — returns server metadata for discovery
  if (req.method === "GET") {
    return jsonResponse({
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      protocol: PROTOCOL_VERSION,
      tools: ALL_TOOLS.length,
      categories: ["supabase-db", "github", "cloudflare", "omnihub"],
    });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
});

// ──────────────────────────────────────────────────────────────────
// POST handler — dispatches JSON-RPC messages
// ──────────────────────────────────────────────────────────────────

async function handlePost(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(rpcError(null, -32700, "Parse error"), 400);
  }

  // Handle batch requests
  if (Array.isArray(body)) {
    const results = await Promise.all(body.map(handleRpcMessage));
    const responses = results.filter((r) => r !== null);
    return jsonResponse(responses);
  }

  const result = await handleRpcMessage(body as RpcRequest);
  if (result === null) {
    // Notification — no response body required
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }
  return jsonResponse(result);
}

// ──────────────────────────────────────────────────────────────────
// JSON-RPC message dispatcher
// ──────────────────────────────────────────────────────────────────

interface RpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: unknown;
}

async function handleRpcMessage(msg: RpcRequest): Promise<unknown> {
  if (msg.jsonrpc !== "2.0") {
    return rpcError(msg.id ?? null, -32600, "Invalid Request: jsonrpc must be '2.0'");
  }

  const { id, method, params } = msg;
  const isNotification = id === undefined || id === null;

  switch (method) {
    case "initialize":
      return rpcOk(id!, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });

    case "notifications/initialized":
    case "initialized":
      return null; // Notification — no response

    case "ping":
      return rpcOk(id!, {});

    case "tools/list":
      return rpcOk(id!, { tools: ALL_TOOLS });

    case "tools/call": {
      const p = params as { name?: string; arguments?: Record<string, unknown> } | undefined;
      if (!p?.name) {
        return rpcError(id ?? null, -32602, "Invalid params: 'name' is required");
      }
      const toolExists = ALL_TOOLS.some((t) => t.name === p.name);
      if (!toolExists) {
        return rpcError(id ?? null, -32602, `Unknown tool: ${p.name}`);
      }
      const result = await dispatchTool(p.name, p.arguments ?? {});
      return rpcOk(id!, result);
    }

    case "resources/list":
      return rpcOk(id!, { resources: [] });

    case "prompts/list":
      return rpcOk(id!, { prompts: [] });

    default:
      if (isNotification) return null;
      return rpcError(id ?? null, -32601, `Method not found: ${method}`);
  }
}

// ──────────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────────

function isAuthorized(req: Request): boolean {
  const apiKey = Deno.env.get("MCP_GATEWAY_API_KEY");
  if (!apiKey) {
    // No key configured — allow (useful during initial setup)
    return true;
  }
  // 1. Bearer token header (programmatic clients)
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ") && authHeader.slice(7) === apiKey) {
    return true;
  }
  // 2. x-api-key header
  if (req.headers.get("x-api-key") === apiKey) return true;
  // 3. ?key= query param — lets the key be embedded in the connector URL
  const url = new URL(req.url);
  if (url.searchParams.get("key") === apiKey) return true;
  return false;
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function rpcOk(id: string | number, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}
