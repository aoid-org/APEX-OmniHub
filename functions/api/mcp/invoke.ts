/**
 * OmniPort Gateway — Cloudflare Pages Function
 * Route: /api/mcp/invoke
 * Version: 2.0.0
 *
 * Same-origin gateway for APEX Agent invocation.
 * - Requires POST + Authorization Bearer (Supabase user JWT)
 * - Inserts agent_run with migration-defined schema (thread_id, user_message, status=running)
 * - Forwards to Supabase apex-agent with user JWT (not service-role)
 * - Polls agent_runs for terminal state using migration-defined columns
 * - Streams SSE: queued (browser-only) → running → completed/failed/timeout
 *
 * NON-NEGOTIABLES:
 * - Never uses service-role key for user-scoped reads
 * - Never leaks secrets or stack traces
 * - RLS preserved via user JWT forwarded to Supabase
 * - DB status values match migration CHECK constraint: running/completed/failed/timeout
 */

export const onRequestPost: PagesFunction = async (context) => {
  const req = context.request;
  const env = context.env as Record<string, string>;

  // ── CORS headers ──────────────────────────────────────────────────────────
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

  const context_ = body.context ?? {};
  if (typeof context_ !== "object" || Array.isArray(context_)) {
    return jsonError("bad_request: context must be a plain object", 400, corsHeaders);
  }

  let traceId: string;
  if (typeof body.traceId === "string" && isValidUUID(body.traceId)) {
    traceId = body.traceId;
  } else {
    traceId = crypto.randomUUID();
  }

  // Silently ignore unsupported providerPreference (hint only, never authoritative)
  const providerPreference = body.providerPreference;
  if (
    providerPreference !== undefined &&
    providerPreference !== "groq" &&
    providerPreference !== "anthropic"
  ) {
    // Ignored
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

  // ── 5. SSE response setup ─────────────────────────────────────────────────
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

  // ── 6. Async orchestration (fire-and-forget into background) ─────────────
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

// ── OPTIONS preflight ─────────────────────────────────────────────────────────

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

// ── Gateway orchestration logic ───────────────────────────────────────────────

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
    // Notify browser immediately — "queued" is browser-only; DB constraint forbids it
    await emit("status", { traceId, status: "queued" });

    // ── Insert agent_run using migration-defined schema ──────────────────────
    const now = new Date().toISOString();
    let insertRes: Response | null = null;
    try {
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
          start_time: now,
          created_at: now,
          metadata: { source: "omniport_gateway", context: ctx },
        }),
      });
    } catch (err) {
      console.error("[omniport-gateway] Network error on agent_run insert:", err);
      // insertRes stays null — network failure is terminal
    }

    if (insertRes === null) {
      await emit("failed", { traceId, status: "failed", error: "agent_run_insert_failed" });
      await writer.close();
      return;
    }

    if (!insertRes.ok) {
      const rawBody = await insertRes.text().catch(() => "");
      const sanitized = rawBody.substring(0, 200).replace(/[^\w\s{}:"',.-]/g, "");
      console.error(
        `[omniport-gateway] agent_run insert failed (${insertRes.status}): ${sanitized}`,
      );
      await emit("failed", { traceId, status: "failed", error: "agent_run_insert_failed" });
      await writer.close();
      return;
    }

    // ── Forward to apex-agent ─────────────────────────────────────────────────
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

    let agentData: Record<string, unknown> = {};
    try {
      agentData = await agentResponse.json();
    } catch {
      // Non-fatal
    }

    const workflowId = typeof agentData.workflowId === "string" ? agentData.workflowId : undefined;

    await emit("status", { traceId, status: "running", workflowId });

    // ── Poll agent_runs for terminal state ────────────────────────────────────
    await pollAgentRuns(traceId, prompt, userJwt, supabaseUrl, supabaseAnonKey, workflowId, emit);

    await writer.close();
  } catch (err) {
    console.error("[omniport-gateway] runGateway error:", err);
    try {
      await emit("failed", { traceId, status: "failed", error: "internal_gateway_error" });
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
  emit: (event: string, data: Record<string, unknown>) => Promise<void>,
): Promise<void> {
  const POLL_INTERVAL_MS = 750;
  const TIMEOUT_MS = 90_000;
  const startTime = Date.now();

  while (Date.now() - startTime < TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS);

    // Only select migration-defined columns
    const pollRes = await fetch(
      `${supabaseUrl}/rest/v1/agent_runs?id=eq.${encodeURIComponent(traceId)}&select=id,status,agent_response,error_message,end_time,metadata`,
      {
        headers: {
          "Authorization": `Bearer ${userJwt}`,
          "apikey": supabaseAnonKey,
          "Accept": "application/json",
        },
      },
    ).catch((err) => {
      console.warn("[omniport-gateway] poll network error:", err);
      return null;
    });

    if (pollRes === null) continue; // transient network error — keep polling

    if (!pollRes.ok) {
      const rawBody = await pollRes.text().catch(() => "");
      const sanitized = rawBody.substring(0, 200).replace(/[^\w\s{}:"',.-]/g, "");
      console.error(`[omniport-gateway] poll failed (${pollRes.status}): ${sanitized}`);
      await emit("failed", { traceId, status: "failed", error: "agent_run_poll_failed" });
      return;
    }

    let rows: Array<Record<string, unknown>> = [];
    try {
      rows = (await pollRes.json()) as Array<Record<string, unknown>>;
    } catch (err) {
      console.warn("[omniport-gateway] poll JSON parse error:", err);
      continue;
    }

    const row = rows?.[0];
    if (!row) continue;

    const status = row.status as string | undefined;

    if (status === "completed") {
      const reply = buildReplyFromAgentResponse(row.agent_response, prompt);
      const parsedResult = parseAgentResult(row.agent_response);
      await emit("completed", {
        traceId,
        status: "completed",
        reply,
        result: parsedResult,
        workflowId,
      });
      return;
    }

    if (status === "failed") {
      await emit("failed", {
        traceId,
        status: "failed",
        error: sanitizeError(row.error_message),
        workflowId,
      });
      return;
    }

    // status is running — keep polling
  }

  // Timeout
  await emit("timeout", { traceId, status: "timeout", workflowId });
}

// ── Exported helpers (also used in tests) ────────────────────────────────────

/**
 * Build a human-readable reply string from an agent_response column value.
 * agent_response may be a JSON string, a plain string, or an object.
 */
export function buildReplyFromAgentResponse(agentResponse: unknown, prompt: string): string {
  if (typeof agentResponse === "string" && agentResponse.length > 0) {
    try {
      const parsed = JSON.parse(agentResponse) as Record<string, unknown>;
      if (typeof parsed.reply === "string" && parsed.reply) return parsed.reply;
      if (typeof parsed.message === "string" && parsed.message) return parsed.message;
      if (typeof parsed.result === "string" && parsed.result) return parsed.result;
      if (typeof parsed.goal === "string" && parsed.goal) {
        return `APEX Agent completed the workflow for: "${parsed.goal}".`;
      }
    } catch {
      // Not JSON — return as-is if short enough
      if (agentResponse.length <= 500) return agentResponse;
    }
  }
  if (typeof agentResponse === "object" && agentResponse !== null) {
    const obj = agentResponse as Record<string, unknown>;
    if (typeof obj.reply === "string" && obj.reply) return obj.reply;
    if (typeof obj.goal === "string" && obj.goal) {
      return `APEX Agent completed the workflow for: "${obj.goal}".`;
    }
  }
  return `APEX Agent completed the workflow for: "${prompt}".`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseAgentResult(agentResponse: unknown): unknown {
  if (typeof agentResponse === "string") {
    try {
      return JSON.parse(agentResponse);
    } catch {
      return agentResponse;
    }
  }
  return agentResponse != null ? agentResponse : {};
}

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function sanitizeError(err: unknown): string {
  if (typeof err === "string") {
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
