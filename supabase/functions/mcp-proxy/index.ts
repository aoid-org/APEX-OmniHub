/**
 * ============================================================
 * MCP Proxy — Stdio Transport Bridge for Edge Functions
 * ============================================================
 *
 * Project:    APEX OmniHub — MCP Protocol Integration
 * Module:     mcp-proxy
 * Version:    1.0.0
 * Date:       2026-03-24
 * Author:     APEX Business Systems Engineering
 * License:    Proprietary — APEX Business Systems
 *
 * Bridges browser-based MCP clients with stdio-based MCP servers
 * by proxying JSON-RPC messages through HTTP. The proxy manages
 * server lifecycle and enforces authentication, rate limiting, and
 * a fail-closed server-side RPC policy.
 *
 * Endpoints:
 *   POST /connect    — Start an MCP server process
 *   POST /disconnect — Stop an MCP server process
 *   POST /rpc        — Forward JSON-RPC request to server stdin/stdout
 *
 * Security:
 *   - Auth required on all endpoints (Supabase JWT)
 *   - Rate limited per user (20 req/min)
 *   - Server ID validated against a low-privilege allowlist
 *   - High-privilege MCPs are not exposed to this public proxy
 *   - RPC method policy blocks direct tool execution bypasses
 *   - CORS: fail-closed origin validation
 */

import { z } from "https://esm.sh/zod@3.25.76";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import {
  checkRateLimit,
  rateLimitExceededResponse,
} from "../_shared/rate-limit.ts";

// ──────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? '',
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
);

/**
 * Public proxy allowlist: only low-privilege MCPs may be spawned from user traffic.
 * High-privilege integrations (GitHub/Supabase/Google Workspace) require a scoped
 * backend broker and must never receive platform-wide secrets in per-user children.
 */
const ALLOWED_SERVERS = new Set([
  'firecrawl',
]);

/** Server commands and args (validated subset of mcp.config.ts) */
const SERVER_COMMANDS: Record<string, { command: string; args: string[]; envKeys: string[] }> = {
  firecrawl: {
    command: 'npx',
    args: ['-y', 'firecrawl-mcp'],
    envKeys: ['FIRECRAWL_API_KEY'],
  },
};

/** JSON-RPC methods safe for lifecycle and discovery without tool execution. */
const ALLOWED_RPC_METHODS = new Set([
  'initialize',
  'ping',
  'tools/list',
  'resources/list',
  'prompts/list',
]);

const ALLOWED_NOTIFICATION_PREFIX = 'notifications/';

const RATE_LIMIT = { maxRequests: 20, windowMs: 60_000, keyPrefix: 'mcp-proxy' };

// ──────────────────────────────────────────────────────────
// Zod Schemas
// ──────────────────────────────────────────────────────────

const ConnectRequestSchema = z.object({
  serverId: z.string().min(1).max(100),
});

const DisconnectRequestSchema = z.object({
  serverId: z.string().min(1).max(100),
});

const RpcRequestSchema = z.object({
  serverId: z.string().min(1).max(100),
  request: z.object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number()]),
    method: z.string().min(1).max(200),
    params: z.record(z.unknown()).optional(),
  }),
});

// ──────────────────────────────────────────────────────────
// Process Registry (per-isolate lifecycle)
// ──────────────────────────────────────────────────────────

interface ManagedProcess {
  process: Deno.ChildProcess;
  stdin: WritableStreamDefaultWriter<Uint8Array>;
  stdoutReader: ReadableStreamDefaultReader<Uint8Array>;
  userId: string;
  startedAt: number;
}

const activeProcesses = new Map<string, ManagedProcess>();

// ──────────────────────────────────────────────────────────
// Server
// ──────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handlePreflight(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  // ── Auth ──────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) {
    return json({ error: "Unauthorized" }, 401, corsHeaders);
  }

  // ── Rate limit ────────────────────────────────────────
  const rl = await checkRateLimit(user.id, RATE_LIMIT);
  if (!rl.allowed) return rateLimitExceededResponse(origin, rl);

  const url = new URL(req.url);
  const path = url.pathname;

  try {
    if (path.endsWith("/connect") && req.method === "POST") {
      return await handleConnect(req, user.id, corsHeaders);
    }
    if (path.endsWith("/disconnect") && req.method === "POST") {
      return await handleDisconnect(req, user.id, corsHeaders);
    }
    if (path.endsWith("/rpc") && req.method === "POST") {
      return await handleRpc(req, user.id, corsHeaders);
    }

    return json({ error: "Not found" }, 404, corsHeaders);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({
        error: "Validation failed",
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      }, 400, corsHeaders);
    }
    console.error("[mcp-proxy] Error:", error);
    return json({ error: "Internal server error" }, 500, corsHeaders);
  }
});

// ──────────────────────────────────────────────────────────
// Handlers
// ──────────────────────────────────────────────────────────

async function handleConnect(
  req: Request,
  userId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { serverId } = ConnectRequestSchema.parse(await req.json());

  if (!ALLOWED_SERVERS.has(serverId)) {
    return json({ error: `Server is not enabled for public MCP proxy: ${serverId}` }, 403, corsHeaders);
  }

  const processKey = `${userId}:${serverId}`;
  if (activeProcesses.has(processKey)) {
    return json({ status: "already_connected", serverId }, 200, corsHeaders);
  }

  const serverConfig = SERVER_COMMANDS[serverId];
  if (!serverConfig) {
    return json({ error: `No config for server: ${serverId}` }, 400, corsHeaders);
  }

  // Build env vars from Deno.env
  const env: Record<string, string> = {};
  for (const key of serverConfig.envKeys) {
    const value = Deno.env.get(key);
    if (value) env[key] = value;
  }

  const command = new Deno.Command(serverConfig.command, {
    args: serverConfig.args,
    env,
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const process = command.spawn();
  const stdin = process.stdin.getWriter();
  const stdoutReader = process.stdout.getReader();

  activeProcesses.set(processKey, {
    process,
    stdin,
    stdoutReader,
    userId,
    startedAt: Date.now(),
  });

  // Auto-cleanup after 30 minutes
  setTimeout(() => {
    cleanupProcess(processKey);
  }, 30 * 60 * 1000);

  return json({ status: "connected", serverId }, 200, corsHeaders);
}

async function handleDisconnect(
  req: Request,
  userId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { serverId } = DisconnectRequestSchema.parse(await req.json());
  const processKey = `${userId}:${serverId}`;

  await cleanupProcess(processKey);
  return json({ status: "disconnected", serverId }, 200, corsHeaders);
}

async function handleRpc(
  req: Request,
  userId: string,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const { serverId, request } = RpcRequestSchema.parse(await req.json());
  const processKey = `${userId}:${serverId}`;

  if (!isRpcMethodAllowed(request.method)) {
    return json({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: `RPC method is not allowed by MCP proxy policy: ${request.method}` },
    }, 403, corsHeaders);
  }

  const managed = activeProcesses.get(processKey);
  if (!managed) {
    return json({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32600, message: `Server not connected: ${serverId}` },
    }, 400, corsHeaders);
  }

  // Verify the process belongs to the authenticated user
  if (managed.userId !== userId) {
    return json({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32600, message: "Process ownership mismatch" },
    }, 403, corsHeaders);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  try {
    // Write JSON-RPC to stdin
    const payload = JSON.stringify(request) + "\n";
    await managed.stdin.write(encoder.encode(payload));

    // Read response from stdout with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("MCP server response timeout (30s)")), 30_000)
    );

    const readPromise = managed.stdoutReader.read().then(({ value }) => {
      if (!value) throw new Error("Server closed stdout");
      return decoder.decode(value);
    });

    const responseText = await Promise.race([readPromise, timeoutPromise]);

    // Parse and validate JSON-RPC response
    const responseJson = JSON.parse(responseText.trim().split('\n').pop() ?? '{}');
    return json(responseJson, 200, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "RPC failed";
    return json({
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32603, message },
    }, 500, corsHeaders);
  }
}

// ──────────────────────────────────────────────────────────
// Cleanup
// ──────────────────────────────────────────────────────────

async function cleanupProcess(processKey: string): Promise<void> {
  const managed = activeProcesses.get(processKey);
  if (!managed) return;

  try {
    managed.stdin.close().catch(() => {});
    managed.stdoutReader.cancel().catch(() => {});
    managed.process.kill("SIGTERM");
  } catch {
    // Process may already be dead
  }

  activeProcesses.delete(processKey);
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function isRpcMethodAllowed(method: string): boolean {
  // Notifications are protocol-level events, not tool invocations.
  if (method.startsWith(ALLOWED_NOTIFICATION_PREFIX)) return true;
  return ALLOWED_RPC_METHODS.has(method);
}

function json(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
