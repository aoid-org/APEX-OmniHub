/**
 * Trigger Workflow Edge Function - The Moat Gateway
 *
 * A hardened entry point that enforces:
 * - Idempotency (prevents double-billing)
 * - Cryptographic Signing (SHA-256 request hash)
 * - Dynamic URL resolution (Production vs Local)
 *
 * Author: APEX CTO
 * Date: 2026-01-25
 * Architecture: Edge Gateway -> Temporal Orchestrator -> AI
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  withHttp,
  jsonResponse,
  type HttpHandlerContext,
} from "../_shared/http.ts";
import { buildSignedHeaders } from "../_shared/requestSigning.ts";
import {
  normalizeToEventEnvelope,
  toPythonEventEnvelope,
} from "../_shared/event-ingress-adapter.ts";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from "../_shared/rate-limit.ts";

/** Workflow request payload structure */
type TriggerWorkflowPayload =
  | {
      kind: "goal";
      query: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      session_id: string;
      trace_id: string;
      idempotency_key: string;
    }
  | {
      kind: "module_action";
      module_key: string;
      action_id: string;
      selected_items: string[];
      trace_id: string;
      idempotency_key: string;
    }
  | {
      kind: "intent";
      intentId?: string;
      intent_id?: string;
      intent?: string;
      tenantId?: string;
      tenant_id?: string;
      idempotency_key?: string;
    };

interface WorkflowRequestPayload {
  query: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  session_id: string; // Thread ID
  idempotency_key: string;
  trace_id: string; // Run ID
}

/** Workflow response structure */
interface WorkflowResponse {
  workflow_id: string;
  status: "queued" | "active";
  request_hash: string;
}

/**
 * Default local development orchestrator URL.
 *
 * SECURITY NOTE (NOSONAR): This HTTP URL is intentionally used ONLY for local
 * Docker development where TLS is not available. The function enforces that:
 * 1. Production environments MUST set ORCHESTRATOR_URL (checked via SUPABASE_DB_URL)
 * 2. This fallback is NEVER used when SUPABASE_DB_URL is present
 * 3. Local Docker networking (host.docker.internal) doesn't support HTTPS
 *
 * In production, ORCHESTRATOR_URL must be set to an HTTPS endpoint.
 */
const LOCAL_DEV_ORCHESTRATOR_URL = "http://host.docker.internal:8000"; // NOSONAR

/**
 * Resolve the orchestrator URL based on environment.
 *
 * Security enforcement:
 * - Production: MUST use ORCHESTRATOR_URL env var (enforced, should be HTTPS)
 * - Local dev: Falls back to LOCAL_DEV_ORCHESTRATOR_URL only when not in production
 *
 * @throws Error if in production without ORCHESTRATOR_URL configured
 */
function resolveOrchestratorUrl(): string {
  // Primary: Use explicitly configured URL (should be HTTPS in production)
  const envUrl = Deno.env.get("ORCHESTRATOR_URL");
  if (envUrl) {
    return envUrl;
  }

  // Check if running in Supabase hosted/production environment
  const isProduction = Deno.env.get("SUPABASE_DB_URL") !== undefined;
  if (isProduction) {
    // SECURITY: Fail-fast in production - require explicit HTTPS configuration
    throw new Error(
      "ORCHESTRATOR_URL must be set in production environment. " +
        "Configure an HTTPS endpoint for the workflow orchestrator."
    );
  }

  // Local development only: use Docker internal hostname
  // This code path is unreachable in production (guarded above)
  console.warn(
    "[trigger-workflow] Using local development orchestrator URL. " +
      "Set ORCHESTRATOR_URL for production deployments."
  );
  return LOCAL_DEV_ORCHESTRATOR_URL;
}

/**
 * Compute SHA-256 hash of the request for integrity verification.
 * Uses Web Crypto API (available in Deno).
 */
async function computeRequestHash(
  query: string,
  sessionId: string,
  traceId: string
): Promise<string> {
  const data = `${query}|${sessionId}|${traceId}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

/** UUID regex pattern for idempotency key validation */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Check if a value is a valid UUID.
 */
function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validate a single history message entry.
 */
function isValidHistoryMessage(msg: unknown): boolean {
  if (!msg || typeof msg !== "object") return false;
  const m = msg as Record<string, unknown>;
  const hasValidRole = m.role === "user" || m.role === "assistant";
  const hasValidContent = typeof m.content === "string";
  return hasValidRole && hasValidContent;
}

/**
 * Validate the history array if present.
 */
function isValidHistory(history: unknown): boolean {
  if (history === undefined) return true;
  if (!Array.isArray(history)) return false;
  return history.every(isValidHistoryMessage);
}

/**
 * Validate the request payload structure.
 * Extracted sub-validations reduce cognitive complexity.
 */
function validateGoalPayload(body: unknown): body is WorkflowRequestPayload {
  if (!body || typeof body !== "object") return false;

  const payload = body as Record<string, unknown>;

  // Validate required string fields
  const hasValidQuery = isNonEmptyString(payload.query);
  const hasValidSessionId = isNonEmptyString(payload.session_id);
  const hasValidIdempotencyKey = isNonEmptyString(payload.idempotency_key);
  const hasValidTraceId = isNonEmptyString(payload.trace_id);

  if (
    !hasValidQuery ||
    !hasValidSessionId ||
    !hasValidIdempotencyKey ||
    !hasValidTraceId
  ) {
    return false;
  }

  // Validate UUID format for idempotency_key
  if (!isValidUuid(payload.idempotency_key as string)) {
    return false;
  }

  // Validate UUID format for trace_id
  if (!isValidUuid(payload.trace_id as string)) {
    return false;
  }

  // Validate optional history array
  return isValidHistory(payload.history);
}

function validateModuleActionPayload(
  body: unknown
): body is Extract<TriggerWorkflowPayload, { kind: "module_action" }> {
  if (!body || typeof body !== "object") return false;
  const payload = body as Record<string, unknown>;
  if (payload.kind !== "module_action") return false;
  if (
    !isNonEmptyString(payload.module_key) ||
    !isNonEmptyString(payload.action_id)
  )
    return false;
  if (
    !Array.isArray(payload.selected_items) ||
    !payload.selected_items.every((item) => typeof item === "string")
  )
    return false;
  return (
    isNonEmptyString(payload.trace_id) &&
    isValidUuid(payload.trace_id) &&
    isNonEmptyString(payload.idempotency_key) &&
    isValidUuid(payload.idempotency_key)
  );
}

function hasIntentSignal(body: unknown): body is Record<string, unknown> {
  if (!body || typeof body !== "object") return false;
  const payload = body as Record<string, unknown>;
  return (
    payload.kind === "intent" ||
    typeof payload.intentId === "string" ||
    typeof payload.intent_id === "string" ||
    typeof payload.intent === "string"
  );
}

function sourceIpFromRequest(req: Request): string | undefined {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    undefined
  );
}

async function dispatchIntent(
  rawBody: Record<string, unknown>,
  authUserId: string,
  req: Request,
  corsHeaders: HeadersInit
): Promise<Response> {
  const tsEnvelope = normalizeToEventEnvelope(rawBody, {
    sourceIp: sourceIpFromRequest(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
    channel: "api",
  });

  const pythonEnvelope = toPythonEventEnvelope(tsEnvelope, authUserId);
  const orchestratorUrl = resolveOrchestratorUrl();
  const intentPath = "/api/v1/intents";
  const intentBody = JSON.stringify(pythonEnvelope);

  const signedHeaders = await buildSignedHeaders(
    "POST",
    intentPath,
    intentBody,
    tsEnvelope.traceId
  );
  const intentResponse = await fetch(`${orchestratorUrl}${intentPath}`, {
    method: "POST",
    headers: {
      ...signedHeaders,
      "X-Idempotency-Key": tsEnvelope.idempotencyKey,
      "X-User-Id": authUserId,
      "X-Trace-Id": tsEnvelope.traceId,
    },
    body: intentBody,
  });

  if (!intentResponse.ok) {
    const errorText = await intentResponse.text();
    console.error(
      `Intent orchestrator error: ${intentResponse.status}`,
      errorText
    );
    return jsonResponse(
      { error: "orchestrator_error", message: "Failed to execute intent" },
      502,
      corsHeaders
    );
  }

  const intentData = await intentResponse.json();
  return jsonResponse(
    {
      workflow_id: intentData.workflowId ?? tsEnvelope.traceId,
      status: "queued",
      trace_id: tsEnvelope.traceId,
      idempotency_key: tsEnvelope.idempotencyKey,
      intent_id: tsEnvelope.intentId,
    },
    202,
    corsHeaders
  );
}

type AuthenticatedHttpUser = NonNullable<HttpHandlerContext["user"]>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invalidPayloadResponse(
  message: string,
  corsHeaders: HeadersInit
): Response {
  return jsonResponse({ error: "invalid_payload", message }, 400, corsHeaders);
}

function hasClientScopedIdentity(rawBody: Record<string, unknown>): boolean {
  return (
    "user_id" in rawBody || "tenant_id" in rawBody || "tenantId" in rawBody
  );
}

function buildModuleActionIntentPayload(
  rawBody: Extract<TriggerWorkflowPayload, { kind: "module_action" }>,
  tenantId: string
): Record<string, unknown> {
  return {
    intent: `module.${rawBody.module_key}.${rawBody.action_id}`,
    tenantId,
    module_key: rawBody.module_key,
    action_id: rawBody.action_id,
    selected_items: rawBody.selected_items,
    idempotency_key: rawBody.idempotency_key,
    trace_id: rawBody.trace_id,
  };
}

async function handleModuleActionPayload(
  rawBody: Record<string, unknown>,
  authUser: AuthenticatedHttpUser,
  req: Request,
  corsHeaders: HeadersInit
): Promise<Response | null> {
  if (rawBody.kind !== "module_action") {
    return null;
  }

  if (!validateModuleActionPayload(rawBody)) {
    return invalidPayloadResponse(
      "Required: module_key, action_id, selected_items, trace_id UUID, idempotency_key UUID",
      corsHeaders
    );
  }

  if (hasClientScopedIdentity(rawBody)) {
    return invalidPayloadResponse(
      "Client-supplied user_id or tenant_id is not accepted",
      corsHeaders
    );
  }

  // No authoritative tenant membership table is used by this edge contract; use auth user ID as tenant fallback.
  const resolvedTenantId = authUser.id;
  return await dispatchIntent(
    buildModuleActionIntentPayload(rawBody, resolvedTenantId),
    authUser.id,
    req,
    corsHeaders
  );
}

async function handleIntentPayload(
  rawBody: Record<string, unknown>,
  authUser: AuthenticatedHttpUser,
  req: Request,
  corsHeaders: HeadersInit
): Promise<Response | null> {
  if (!hasIntentSignal(rawBody)) {
    return null;
  }

  return await dispatchIntent(
    {
      ...rawBody,
      tenantId: authUser.id,
      tenant_id: authUser.id,
    },
    authUser.id,
    req,
    corsHeaders
  );
}

async function dispatchGoalWorkflow(
  payload: WorkflowRequestPayload,
  authUserId: string,
  corsHeaders: HeadersInit
): Promise<Response> {
  const requestHash = await computeRequestHash(
    payload.query,
    payload.session_id,
    payload.trace_id
  );

  const orchestratorUrl = resolveOrchestratorUrl();
  const requestPath = "/api/v1/goals";
  const bodyRaw = JSON.stringify({
    user_id: authUserId,
    user_intent: payload.query,
    trace_id: payload.trace_id,
  });

  const signedHeaders = await buildSignedHeaders(
    "POST",
    requestPath,
    bodyRaw,
    payload.trace_id
  );

  const orchestratorResponse = await fetch(`${orchestratorUrl}${requestPath}`, {
    method: "POST",
    headers: {
      ...signedHeaders,
      "X-Idempotency-Key": payload.idempotency_key,
      "X-Request-Signature": requestHash,
      "X-User-Id": authUserId,
      "X-Session-Id": payload.session_id,
    },
    body: bodyRaw,
  });

  if (orchestratorResponse.ok) {
    const orchestratorData = await orchestratorResponse.json();
    const response: WorkflowResponse = {
      workflow_id: orchestratorData.workflowId ?? payload.trace_id,
      status: "queued",
      request_hash: requestHash,
    };
    return jsonResponse(response, 202, corsHeaders);
  }

  const errorText = await orchestratorResponse.text();
  console.error(
    `Orchestrator error: ${orchestratorResponse.status}`,
    errorText
  );

  if (orchestratorResponse.status === 409) {
    const existingData = JSON.parse(errorText);
    return jsonResponse(
      {
        workflow_id: existingData.workflow_id,
        status: "active" as const,
        request_hash: requestHash,
        deduplicated: true,
      },
      200,
      corsHeaders
    );
  }

  return jsonResponse(
    { error: "orchestrator_error", message: "Failed to trigger workflow" },
    502,
    corsHeaders
  );
}

function workflowErrorResponse(
  error: unknown,
  corsHeaders: HeadersInit
): Response {
  console.error("Workflow trigger error:", error);

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return jsonResponse(
      {
        error: "orchestrator_unavailable",
        message: "Workflow orchestrator is not available",
      },
      503,
      corsHeaders
    );
  }

  return jsonResponse(
    {
      error: "internal_error",
      message: error instanceof Error ? error.message : "Unknown error",
    },
    500,
    corsHeaders
  );
}

async function handleTriggerWorkflow(
  req: Request,
  ctx: HttpHandlerContext
): Promise<Response> {
  if (req.method !== "POST") {
    return jsonResponse(
      { error: "method_not_allowed", message: "Only POST is allowed" },
      405,
      ctx.corsHeaders
    );
  }

  const authUser = ctx.user;
  if (!authUser) {
    return jsonResponse({ error: "unauthorized" }, 401, ctx.corsHeaders);
  }

  // Distributed rate limiting — per authenticated user, before any business logic
  const rl = await checkRateLimit(authUser.id, RATE_LIMIT_CONFIGS.triggerWorkflow);
  if (!rl.allowed) {
    return rateLimitExceededResponse(req.headers.get("origin"), rl);
  }

  if (!isRecord(ctx.body)) {
    return invalidPayloadResponse(
      "Request body must be an object",
      ctx.corsHeaders
    );
  }

  try {
    const moduleActionResponse = await handleModuleActionPayload(
      ctx.body,
      authUser,
      req,
      ctx.corsHeaders
    );
    if (moduleActionResponse) return moduleActionResponse;

    const intentResponse = await handleIntentPayload(
      ctx.body,
      authUser,
      req,
      ctx.corsHeaders
    );
    if (intentResponse) return intentResponse;

    if (!validateGoalPayload(ctx.body)) {
      return invalidPayloadResponse(
        "Required: query (string), session_id (string), trace_id (UUID), idempotency_key (UUID)",
        ctx.corsHeaders
      );
    }

    return await dispatchGoalWorkflow(ctx.body, authUser.id, ctx.corsHeaders);
  } catch (error) {
    return workflowErrorResponse(error, ctx.corsHeaders);
  }
}

serve(
  withHttp(handleTriggerWorkflow, {
    maxBodySizeBytes: 256 * 1024, // 256KB max payload
    requireOrigin: true,
    requireAuth: true,
  })
);
