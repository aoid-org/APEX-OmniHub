import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { createAnonClient } from "../_shared/supabaseClient.ts";
import { buildSignedHeaders } from "../_shared/requestSigning.ts";
import { checkRequest } from "./guardian.ts";

/** Build a JSON response with CORS headers. */
function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  // Handle CORS preflight requests with origin validation
  if (req.method === "OPTIONS") {
    return handlePreflight(req);
  }

  const origin = req.headers.get("origin");

  try {
    // 1. Auth validation — missing auth must return 401, not 500
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "unauthorized" }, 401, origin);
    }

    const supabase = createAnonClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "unauthorized" }, 401, origin);
    }

    // 2. Content-Type validation
    const contentType = req.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return jsonResponse({ error: "unsupported_media_type" }, 415, origin);
    }

    // 3. Safe JSON parse
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "bad_request" }, 400, origin);
    }

    // 4. Validate required fields
    if (typeof body.query !== "string" || typeof body.traceId !== "string") {
      return jsonResponse({ error: "bad_request" }, 400, origin);
    }

    const query = body.query as string;
    const traceId = body.traceId as string;

    // 5. Guardian enforcement (toggled via OMNI_GUARDIAN_ENABLED, default true)
    const guardianEnabled = Deno.env.get("OMNI_GUARDIAN_ENABLED") !== "false";
    if (guardianEnabled) {
      const guardianResult = await checkRequest(query, authHeader);
      if (!guardianResult.allowed) {
        return jsonResponse({ error: "request_blocked" }, 429, origin);
      }
    }

    // 6. Update agent_runs status to 'running'
    const { error: updateError } = await supabase
      .from("agent_runs")
      .update({
        status: "running",
        start_time: new Date().toISOString(),
      })
      .eq("id", traceId);

    if (updateError) {
      console.error("Failed to update agent_run status:", updateError.message);
    }

    // 7. Handoff to orchestrator with signed request
    const orchestratorUrl = Deno.env.get("ORCHESTRATOR_URL");
    if (!orchestratorUrl) {
      console.error("ORCHESTRATOR_URL not configured");
      return jsonResponse({ error: "server_error" }, 500, origin);
    }

    const requestPath = "/api/v1/goals";
    const bodyRaw = JSON.stringify({
      user_id: user.id,
      user_intent: query,
      trace_id: traceId,
    });

    const signedHeaders = await buildSignedHeaders(
      "POST",
      requestPath,
      bodyRaw,
      traceId,
    );

    const response = await fetch(`${orchestratorUrl}${requestPath}`, {
      method: "POST",
      headers: signedHeaders,
      body: bodyRaw,
    });

    if (!response.ok) {
      console.error(
        `Orchestrator returned ${response.status}`,
      );
      return jsonResponse({ error: "upstream_error" }, 502, origin);
    }

    const data = await response.json();

    // If orchestrator returned workflowId, update it
    if (data.workflowId) {
      await supabase
        .from("agent_runs")
        .update({ workflow_id: data.workflowId })
        .eq("id", traceId);
    }

    // Return orchestrator response
    return jsonResponse(data, 200, origin);
  } catch (err) {
    console.error("Router error:", err instanceof Error ? err.message : err);
    return jsonResponse({ error: "server_error" }, 500, origin);
  }
});
