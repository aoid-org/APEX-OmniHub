/**
 * OmniHub Platform Monitoring Tools (7 tools)
 * Calls existing APEX edge functions and Supabase admin APIs.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { MCPTool, ToolCallResult } from "./registry.ts";
import { ok, err } from "./registry.ts";

type DbClient = ReturnType<typeof createClient>;

function adminClient(): DbClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

function edgeFnBase(): string {
  return (Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "") + "/functions/v1");
}

function serviceKey(): string {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

export const omnihubTools: MCPTool[] = [
  {
    name: "omnihub_platform_health",
    description: "Get overall APEX OmniHub platform health status.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "omnihub_list_functions",
    description: "List all deployed Supabase Edge Functions with their slugs.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "omnihub_emit_event",
    description: "Emit an OmniLink event to the platform event bus.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Event source identifier" },
        type: { type: "string", description: "Event type (e.g. lead_ingested)" },
        data: { type: "object", description: "Event payload" },
        idempotency_key: { type: "string", description: "Optional idempotency key" },
      },
      required: ["source", "type", "data"],
    },
  },
  {
    name: "omnihub_list_tasks",
    description: "List pending OmniLink tasks, optionally filtered by target.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Filter by task target" },
        status: { type: "string", description: "pending | claimed | succeeded | failed (default: pending)" },
        limit: { type: "number", description: "Max results (default 20)" },
      },
    },
  },
  {
    name: "omnihub_claim_task",
    description: "Claim a pending OmniLink task for processing.",
    inputSchema: {
      type: "object",
      properties: {
        worker_id: { type: "string", description: "Worker identifier" },
        target: { type: "string", description: "Task target to claim" },
      },
      required: ["worker_id", "target"],
    },
  },
  {
    name: "omnihub_complete_task",
    description: "Mark an OmniLink task as succeeded or failed.",
    inputSchema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        worker_id: { type: "string" },
        status: { type: "string", description: "succeeded | failed" },
        output: { type: "object", description: "Output summary (for succeeded)" },
        error_message: { type: "string", description: "Error message (for failed)" },
      },
      required: ["task_id", "worker_id", "status"],
    },
  },
  {
    name: "omnihub_get_metrics",
    description: "Get platform usage metrics: event counts, task throughput, error rates.",
    inputSchema: {
      type: "object",
      properties: {
        window_hours: { type: "number", description: "Lookback window in hours (default 24)" },
      },
    },
  },
];

async function omnihubPlatformHealth(): Promise<ToolCallResult> {
  const res = await fetch(`${edgeFnBase()}/platform-health`, {
    headers: { Authorization: `Bearer ${serviceKey()}` },
  });
  return ok(await res.json());
}

async function omnihubListFunctions(): Promise<ToolCallResult> {
  const functions = [
    "activate-client", "alchemy-webhook", "apex-agent", "apex-assistant",
    "apex-voice", "byom-cockpit", "byom-login", "byom-proxy",
    "create-checkout", "execute-automation", "generate-business-skills",
    "mcp-gateway", "mcp-proxy", "omni-runs", "omnibridge-control",
    "omnilink-eval", "omnilink-port", "omnilink-retry-scheduler",
    "ops-voice-health", "physiomni-action", "physiomni-ingest",
    "physiomni-ingress", "platform-health", "send-push-notification",
    "storage-upload-url", "stripe-webhook", "trigger-workflow",
    "verify-nft", "web3-nonce", "web3-verify",
  ];
  return ok({ functions, base_url: edgeFnBase(), count: functions.length });
}

async function omnihubEmitEvent(args: Record<string, unknown>): Promise<ToolCallResult> {
  const payload = {
    specversion: "1.0",
    id: crypto.randomUUID(),
    source: args.source,
    type: args.type,
    time: new Date().toISOString(),
    data: args.data,
  };
  const headers: Record<string, string> = {
    Authorization: `Bearer ${serviceKey()}`,
    "Content-Type": "application/json",
  };
  if (args.idempotency_key) {
    headers["X-Idempotency-Key"] = String(args.idempotency_key);
  }
  const res = await fetch(`${edgeFnBase()}/omnilink-port/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return ok(await res.json());
}

async function omnihubListTasks(args: Record<string, unknown>): Promise<ToolCallResult> {
  const sb = adminClient();
  const status = (args.status as string | undefined) ?? "pending";
  const limit = Math.min(Number(args.limit ?? 20), 100);
  let q = sb.from("omnilink_tasks").select("*").eq("status", status).limit(limit);
  if (args.target) q = q.eq("target", args.target);
  const { data, error } = await q;
  if (error) return err(error.message);
  return ok(data);
}

async function omnihubClaimTask(args: Record<string, unknown>): Promise<ToolCallResult> {
  const res = await fetch(`${edgeFnBase()}/omnilink-port/tasks/claim`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ worker_id: args.worker_id, target: args.target }),
  });
  return ok(await res.json());
}

async function omnihubCompleteTask(args: Record<string, unknown>): Promise<ToolCallResult> {
  const res = await fetch(`${edgeFnBase()}/omnilink-port/tasks/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      task_id: args.task_id,
      worker_id: args.worker_id,
      status: args.status,
      output: args.output,
      error_message: args.error_message,
    }),
  });
  return ok(await res.json());
}

async function omnihubGetMetrics(args: Record<string, unknown>): Promise<ToolCallResult> {
  const sb = adminClient();
  const windowHours = Number(args.window_hours ?? 24);
  const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

  const [eventsRes, tasksRes] = await Promise.all([
    sb.from("omnilink_events").select("type,created_at", { count: "exact", head: false })
      .gte("created_at", since),
    sb.from("omnilink_tasks").select("status,created_at", { count: "exact", head: false })
      .gte("created_at", since),
  ]);

  const tasksByStatus: Record<string, number> = {};
  for (const row of tasksRes.data ?? []) {
    const s = String(row?.status ?? "unknown");
    tasksByStatus[s] = (tasksByStatus[s] ?? 0) + 1;
  }

  return ok({
    window_hours: windowHours,
    since,
    events: { total: eventsRes.count ?? 0 },
    tasks: { total: tasksRes.count ?? 0, by_status: tasksByStatus },
  });
}

export async function handleOmnihubTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolCallResult> {
  try {
    switch (name) {
      case "omnihub_platform_health": return omnihubPlatformHealth();
      case "omnihub_list_functions":  return omnihubListFunctions();
      case "omnihub_emit_event":      return omnihubEmitEvent(args);
      case "omnihub_list_tasks":      return omnihubListTasks(args);
      case "omnihub_claim_task":      return omnihubClaimTask(args);
      case "omnihub_complete_task":   return omnihubCompleteTask(args);
      case "omnihub_get_metrics":     return omnihubGetMetrics(args);
      default:                        return err(`Unhandled omnihub tool: ${name}`);
    }
  } catch (e) {
    return err(e instanceof Error ? e.message : String(e));
  }
}
