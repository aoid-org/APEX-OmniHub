/**
 * OmniPort Gateway — Cloudflare Pages Function
 * Route: /api/mcp/invoke
 * Version: 1.0.0
 *
 * Same-origin gateway for APEX Agent invocation.
 * - Requires POST + Authorization Bearer (Supabase user JWT)
 * - Inserts agent_run with status=running (migration-defined schema)
 * - Forwards to Supabase apex-agent with user JWT (not service-role)
 * - Polls agent_runs for terminal state (agent_response/error_message/end_time)
 * - Streams SSE: queued → running → completed/failed/timeout
 *   (the browser-facing 'queued' event is cosmetic; DB status is 'running')
 *
 * NON-NEGOTIABLES:
 * - Never uses service-role key for user-scoped reads
 * - Never leaks secrets or stack traces
 * - RLS preserved via user JWT forwarded to Supabase
 */

export const onRequestPost: PagesFunction = async (context) => {
  const req = context.request;
  const env = context.env as Record<string, string>;

  // ── CORS headers (same-origin gateway; browsers still send Origin on POST) ──
  const origin = req.headers.get("Origin") ?? "";
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  // ── 1. Auth — require Bearer token ────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonError("unauthorized", 401, corsHeaders);
  }
  const userJwt = authHeader.slice(7).trim();
  if (!userJwt) return jsonError("unauthorized", 401, corsHeaders);

  // ── 2. Content-Type ───────────────────────────────────────────────────────
  const ct = req.headers.get("Content-Type") ?? "";
  if (!ct.includes("application/json")) {
    return jsonError("unsupported_media_type", 415, corsHeaders);
  }

  // ── 3. Parse + validate body ──────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("bad_request", 400, corsHeaders);
  }

  const prompt = body.prompt;
  if (typeof prompt !== "string" || prompt.length < 1 || prompt.length > 20_000) {
    return jsonError("bad_request: prompt must be a string 1–20000 chars", 400, corsHeaders);
  }

  // Validate optional fields
  const context_ = body.context ?? {};
  if (typeof context_ !== "object" || Array.isArray(context_)) {
    return jsonError("bad_request: context must be a plain object", 400, corsHeaders);
  }

  // Generate or validate traceId
  let traceId: string;
  if (typeof body.traceId === "string" && isValidUUID(body.traceId)) {
    traceId = body.traceId;
  } else {
    traceId = crypto.randomUUID();
  }

  // Validate optional providerPreference (hint only, never authoritative)
  const providerPreference = body.providerPreference;
  if (
    providerPreference !== undefined &&
    providerPreference !== "groq" &&
    providerPreference !== "anthropic"
  ) {
    // Silently ignore unsupported provider preference
  }

  // ── 4. Env validation ─────────────────────────────────────────────────────
  const supabaseUrl = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    env.SUPABASE_PUBLISHABLE_KEY ??
    env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    env.SUPABASE_ANON_KEY ??
    env.VITE_SUPABASE_ANON_KEY ??
    "";

  if (!supabaseUrl) {
    console.error("[omniport-gateway] SUPABASE_URL not configured");
    return jsonError("server_error", 500, corsHeaders);
  }

  // ── 5. agent_run insert happens inside runGateway ─────────────────────────
  // The insert is performed at the start of runGateway so that an insert
  // failure can be surfaced to the browser as a terminal SSE `failed` event
  // (no writer/stream exists yet at this point in onRequestPost).

  // ── 6. SSE response setup ─────────────────────────────────────────────────
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const enc = new TextEncoder();

  const sseResponse = new Response(readable, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });

  // ── 7. Async orchestration (fire-and-forget into background) ─────────────
  runGateway({
    writer,
    enc,
    traceId,
    prompt,
    ctx: context_ as Record<string, unknown>,
    userJwt,
    supabaseUrl,
    supabaseAnonKey,
  }).catch((err) => {
    console.error("[omniport-gateway] Unhandled gateway error:", err);
    writer.close().catch(() => {});
  });

  return sseResponse;
};

// ── OPTIONS preflight ────────────────────────────────────────────────────────

export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get("Origin") ?? "";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    },
  });
};

// ── Gateway orchestration logic ──────────────────────────────────────────────

interface GatewayOptions {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  enc: TextEncoder;
  traceId: string;
  prompt: string;
  ctx: Record<string, unknown>;
  userJwt: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

async function runGateway(options: GatewayOptions): Promise<void> {
  const { writer, enc, traceId, prompt, ctx, userJwt, supabaseUrl, supabaseAnonKey } = options;
  const emit = async (event: string, data: Record<string, unknown>) => {
    try {
      await writer.write(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream may be closed
    }
  };

  try {
    // ── Insert agent_run using the canonical migration schema ───────────────
    // Columns per supabase/migrations/20251221000001_omnilink_ops_pack.sql:
    //   id, thread_id (NOT NULL), status CHECK(running|completed|failed|timeout),
    //   user_message, start_time, created_at, metadata. NO `query` column.
    // user_id defaults to auth.uid() under the user JWT (RLS insert policy).
    let insertRes: Response;
    try {
      const nowIso = new Date().toISOString();
      insertRes = await fetch(`${supabaseUrl}/rest/v1/agent_runs`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userJwt}`,
          "apikey": supabaseAnonKey,
          "Content-Type": "application/json",
          "Prefer": "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: traceId,
          thread_id: traceId,
          status: "running",
          user_message: prompt,
          start_time: nowIso,
          created_at: nowIso,
          metadata: { source: "omniport_gateway", context: ctx },
        }),
      });
    } catch (err) {
      console.error("[omniport-gateway] agent_run insert fetch failed:", err);
      await emit("failed", { traceId, status: "failed", error: "agent_run_insert_failed" });
      await writer.close();
      return;
    }

    if (!insertRes.ok) {
      // Read a sanitized body for logs; never leak it to the client.
      let detail = "";
      try {
        detail = sanitizeError(await insertRes.text());
      } catch {
        // ignore body read failure
      }
      console.error(
        `[omniport-gateway] agent_run insert returned ${insertRes.status}: ${detail}`,
      );
      await emit("failed", { traceId, status: "failed", error: "agent_run_insert_failed" });
      await writer.close();
      return;
    }

    // Emit queued (browser-facing event only; DB status is 'running')
    await emit("status", { traceId, status: "queued" });

    // Forward to apex-agent
    const apexAgentUrl = `${supabaseUrl}/functions/v1/apex-agent`;
    let agentResponse: Response;
    try {
      agentResponse = await fetch(apexAgentUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userJwt}`,
          "apikey": supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: prompt,
          traceId,
          context: ctx,
        }),
      });
    } catch (err) {
      console.error("[omniport-gateway] apex-agent fetch failed:", err);
      await emit("failed", { traceId, status: "failed", error: "upstream_unavailable" });
      await writer.close();
      return;
    }

    if (agentResponse.status === 401) {
      await emit("failed", { traceId, status: "failed", error: "unauthorized" });
      await writer.close();
      return;
    }

    if (!agentResponse.ok) {
      console.error(`[omniport-gateway] apex-agent returned ${agentResponse.status}`);
      await emit("failed", {
        traceId,
        status: "failed",
        error: `upstream_error_${agentResponse.status}`,
      });
      await writer.close();
      return;
    }

    // Parse agent response to get workflowId
    let agentData: Record<string, unknown> = {};
    try {
      agentData = await agentResponse.json();
    } catch {
      // Non-fatal
    }

    const workflowId = typeof agentData.workflowId === "string" ? agentData.workflowId : undefined;

    // Emit running
    await emit("status", { traceId, status: "running", workflowId });

    // ── Poll agent_runs for terminal state ───────────────────────────────────
    await pollAgentRuns(traceId, prompt, userJwt, supabaseUrl, supabaseAnonKey, workflowId, emit);

    await writer.close();
  } catch (err) {
    console.error("[omniport-gateway] runGateway error:", err);
    try {
      await emit("failed", {
        traceId,
        status: "failed",
        error: "internal_gateway_error",
      });
      await writer.close();
    } catch {
      // Already closed
    }
  }
}

async function pollAgentRuns(
  traceId: string,
  prompt: string,
  userJwt: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  workflowId: string | undefined,
  emit: (event: string, data: Record<string, unknown>) => Promise<void>
): Promise<void> {
  const POLL_INTERVAL_MS = 750;
  const TIMEOUT_MS = 90_000;
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);

    // Select ONLY migration-defined columns. Never select result/reply/error/
    // workflow_id/completed_at — those columns do not exist in agent_runs.
    let rows: Array<Record<string, unknown>> = [];
    try {
      const pollRes = await fetch(
        `${supabaseUrl}/rest/v1/agent_runs?id=eq.${encodeURIComponent(traceId)}&select=id,status,agent_response,error_message,end_time,metadata`,
        {
          headers: {
            "Authorization": `Bearer ${userJwt}`,
            "apikey": supabaseAnonKey,
            "Accept": "application/json",
          },
        },
      );
      if (!pollRes.ok) {
        // Do not silently poll forever on a hard error — surface and close.
        let detail = "";
        try {
          detail = sanitizeError(await pollRes.text());
        } catch {
          // ignore
        }
        console.error(
          `[omniport-gateway] agent_runs poll returned ${pollRes.status}: ${detail}`,
        );
        await emit("failed", { traceId, status: "failed", error: "agent_run_poll_failed" });
        return;
      }
      rows = (await pollRes.json()) as Array<Record<string, unknown>>;
    } catch (err) {
      console.warn("[omniport-gateway] poll network error (transient):", err);
      // Continue polling — transient network error
      continue;
    }

    const row = rows?.[0];
    if (!row) continue;

    const status = row.status as string | undefined;
    const metaWorkflowId = extractWorkflowId(row.metadata) ?? workflowId;

    if (status === "completed") {
      const parsed = parseAgentResponse(row.agent_response);
      const reply = buildReply(parsed, prompt);
      await emit("completed", {
        traceId,
        status: "completed",
        reply,
        result: parsed ?? {},
        workflowId: metaWorkflowId,
      });
      return;
    }

    // DB 'timeout' is a terminal state too — treat as failed to avoid hanging.
    if (status === "failed" || status === "timeout") {
      await emit("failed", {
        traceId,
        status: "failed",
        error: sanitizeError(row.error_message),
        workflowId: metaWorkflowId,
      });
      return;
    }

    // status is running — keep polling
  }

  // Timeout
  await emit("timeout", {
    traceId,
    status: "timeout",
    workflowId,
  });
}

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/** Safely parse agent_response: JSON text → object, plain text → string. */
function parseAgentResponse(raw: unknown): unknown {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed; // not JSON — treat as a plain reply string
    }
  }
  return raw;
}

/**
 * Build a human-readable reply from a parsed agent_response.
 * Never returns "[object Object]". Falls back to a deterministic template.
 */
function buildReply(parsed: unknown, fallbackPrompt: string): string {
  if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    for (const key of ["reply", "message", "response", "summary", "text", "output"]) {
      const v = obj[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return `APEX Agent completed the workflow for: "${fallbackPrompt}".`;
}

/** Extract workflow_id from the metadata jsonb column, if present. */
function extractWorkflowId(metadata: unknown): string | undefined {
  if (metadata && typeof metadata === "object") {
    const wid = (metadata as Record<string, unknown>).workflow_id;
    if (typeof wid === "string" && wid) return wid;
  }
  return undefined;
}

function sanitizeError(err: unknown): string {
  if (typeof err === "string") {
    // Remove any stack trace or secret patterns
    return err.replace(/^\s*at\s+.*$/gm, "").substring(0, 200).trim();
  }
  return "agent_execution_failed";
}

function jsonError(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
