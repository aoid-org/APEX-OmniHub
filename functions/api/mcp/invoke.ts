/**
 * OmniPort Gateway — Cloudflare Pages Function
 * Route: /api/mcp/invoke
 * Version: 1.0.0
 *
 * Same-origin gateway for APEX Agent invocation.
 * - Requires POST + Authorization Bearer (Supabase user JWT)
 * - Inserts agent_run with status=queued
 * - Forwards to Supabase apex-agent with user JWT (not service-role)
 * - Polls agent_runs for terminal state
 * - Streams SSE: queued → running → completed/failed/timeout
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
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseAnonKey = env.SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl) {
    console.error("[omniport-gateway] SUPABASE_URL not configured");
    return jsonError("server_error", 500, corsHeaders);
  }

  // ── 5. Insert agent_run as 'queued' before calling apex-agent ─────────────
  // Uses user JWT so RLS is enforced. Only inserts if row doesn't exist.
  try {
    await fetch(`${supabaseUrl}/rest/v1/agent_runs`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userJwt}`,
        "apikey": supabaseAnonKey,
        "Content-Type": "application/json",
        "Prefer": "resolution=ignore-duplicates",
      },
      body: JSON.stringify({
        id: traceId,
        status: "queued",
        query: prompt,
        created_at: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error("[omniport-gateway] Failed to insert agent_run:", err);
    // Non-fatal — apex-agent may create the row or it may already exist
  }

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
  runGateway(
    writer,
    enc,
    traceId,
    prompt,
    context_ as Record<string, unknown>,
    userJwt,
    supabaseUrl,
    supabaseAnonKey,
  ).catch((err) => {
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

async function runGateway(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  enc: TextEncoder,
  traceId: string,
  prompt: string,
  ctx: Record<string, unknown>,
  userJwt: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<void> {
  const emit = async (event: string, data: Record<string, unknown>) => {
    try {
      await writer.write(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream may be closed
    }
  };

  try {
    // Emit queued
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
    const POLL_INTERVAL_MS = 750;
    const TIMEOUT_MS = 90_000;
    const startTime = Date.now();

    while (Date.now() - startTime < TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS);

      let rows: Array<Record<string, unknown>> = [];
      try {
        const pollRes = await fetch(
          `${supabaseUrl}/rest/v1/agent_runs?id=eq.${encodeURIComponent(traceId)}&select=id,status,result,reply,error,workflow_id,completed_at`,
          {
            headers: {
              "Authorization": `Bearer ${userJwt}`,
              "apikey": supabaseAnonKey,
              "Accept": "application/json",
            },
          },
        );
        if (pollRes.ok) {
          rows = (await pollRes.json()) as Array<Record<string, unknown>>;
        }
      } catch (err) {
        console.warn("[omniport-gateway] poll error:", err);
        // Continue polling — transient network error
      }

      const row = rows?.[0];
      if (!row) continue;

      const status = row.status as string | undefined;

      if (status === "completed") {
        const reply =
          (row.reply as string | undefined) ??
          (row.result as string | undefined) ??
          "";
        await emit("completed", {
          traceId,
          status: "completed",
          reply,
          result: row.result ?? {},
          workflowId: row.workflow_id ?? workflowId,
        });
        await writer.close();
        return;
      }

      if (status === "failed") {
        await emit("failed", {
          traceId,
          status: "failed",
          error: sanitizeError(row.error),
          workflowId: row.workflow_id ?? workflowId,
        });
        await writer.close();
        return;
      }

      // status is queued/running — keep polling
    }

    // Timeout
    await emit("timeout", {
      traceId,
      status: "timeout",
      workflowId,
    });
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

// ── Utilities ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function sanitizeError(err: unknown): string {
  if (typeof err === "string") {
    // Remove any stack trace or secret patterns
    return err.replace(/at\s+\w+.*$/gm, "").substring(0, 200).trim();
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
