/**
 * ============================================================
 * BYOM Cockpit API — Phase 2 Edge Function
 * ============================================================
 *
 * Project:    APEX OmniHub — Project COCKPIT (BYOM Architecture)
 * Module:     byom-cockpit
 * Version:    2.0.0
 * Date:       2026-03-24
 * Author:     APEX Business Systems Engineering
 * License:    Proprietary — APEX Business Systems
 * Reference:  byom 3.md §7 — Implementation Roadmap Phase 2
 *
 * Endpoints:
 *   POST /byom/key/connect  — Store encrypted provider credential
 *   POST /byom/key/rotate   — Rotate existing credential
 *   POST /byom/key/revoke   — Revoke a connection
 *   GET  /byom/connections   — List connections (sanitized, no ciphertext)
 *
 * Security (Phase 2 hardened):
 *   - Zod boundary validation on ALL request bodies
 *   - Distributed rate limiting (Upstash) per userId + endpoint
 *   - Multi-tenant isolation: tenant_id enforced on all queries
 *   - service_role client for DB mutations (bypasses RLS)
 *   - auth.uid() verified for every request
 *   - Credential probed against provider before storage
 *   - Audit: all actions logged to audit_logs with NO SECRETS
 *   - CORS: fail-closed origin validation via shared utility
 */

import { z } from "https://esm.sh/zod@3.25.76";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCockpitCrypto } from "../_shared/cockpit-crypto.ts";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  type RateLimitConfig,
} from "../_shared/rate-limit.ts";
import type {
  ByomProvider,
  ByomAuditMetadata,
} from "../_shared/types/byom.ts";

// ──────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────

/** service_role client — bypasses RLS for credential mutations */
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? '',
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
);

const cockpitCrypto = getCockpitCrypto();

/** Per-request origin for CORS (set at top of serve handler). */
let _requestOrigin: string | null = null;

// ──────────────────────────────────────────────────────────
// Zod Schemas — Boundary Validation
// ──────────────────────────────────────────────────────────

const PROVIDERS = ['openai', 'google', 'anthropic', 'xai', 'groq'] as const;
const AUTH_TYPES = ['api_key', 'oauth_refresh', 'oauth_access', 'service_account', 'ephemeral'] as const;

const ConnectSchema = z.object({
  provider: z.enum(PROVIDERS),
  auth_type: z.enum(AUTH_TYPES),
  api_key: z.string().min(10).max(500),
});

const RotateSchema = z.object({
  connection_id: z.string().uuid(),
  new_api_key: z.string().min(10).max(500),
});

const RevokeSchema = z.object({
  connection_id: z.string().uuid(),
});

// ──────────────────────────────────────────────────────────
// Rate Limit Profiles
// ──────────────────────────────────────────────────────────

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  connect:     { maxRequests: 5,  windowMs: 60_000,  keyPrefix: 'byom-connect' },
  rotate:      { maxRequests: 5,  windowMs: 60_000,  keyPrefix: 'byom-rotate' },
  revoke:      { maxRequests: 10, windowMs: 60_000,  keyPrefix: 'byom-revoke' },
  connections: { maxRequests: 30, windowMs: 60_000,  keyPrefix: 'byom-list' },
};

type RouteHandler = (req: Request, userId: string, tenantId: string) => Promise<Response>;

type RouteKey = 'connect' | 'rotate' | 'revoke' | 'connections';

type RouteDefinition = {
  method: 'GET' | 'POST';
  rateLimit: RouteKey;
  handler: RouteHandler;
};

// ──────────────────────────────────────────────────────────
// Provider Validation
// ──────────────────────────────────────────────────────────

/** Provider validation endpoints (used for credential probing) */
const PROVIDER_PROBE_ENDPOINTS: Record<ByomProvider, string> = {
  openai: "https://api.openai.com/v1/models?limit=1",
  anthropic: "https://api.anthropic.com/v1/models?limit=1",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  xai: "https://api.x.ai/v1/models",
  groq: "https://api.groq.com/openai/v1/models",
};

/** API key format regex per provider (early rejection of malformed keys) */
const API_KEY_PATTERNS: Record<ByomProvider, RegExp> = {
  openai: /^sk-[A-Za-z0-9_-]{20,}$/,
  anthropic: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
  google: /^AI[A-Za-z0-9_-]{20,}$/,
  xai: /^xai-[A-Za-z0-9_-]{20,}$/,
  groq: /^gsk_[A-Za-z0-9_-]{20,}$/,
};

/** Allowed providers (Chinese-origin excluded) */
const VALID_PROVIDERS: ReadonlySet<ByomProvider> = new Set<ByomProvider>([
  "openai",
  "google",
  "anthropic",
  "xai",
  "groq",
]);

const ROUTES: Record<string, RouteDefinition> = {
  "/byom/key/connect": {
    method: "POST",
    rateLimit: "connect",
    handler: handleConnect,
  },
  "/byom/key/rotate": {
    method: "POST",
    rateLimit: "rotate",
    handler: handleRotate,
  },
  "/byom/key/revoke": {
    method: "POST",
    rateLimit: "revoke",
    handler: handleRevoke,
  },
  "/byom/connections": {
    method: "GET",
    rateLimit: "connections",
    handler: (_req: Request, userId: string, tenantId: string) => handleListConnections(userId, tenantId),
  },
};

async function dispatchRoute(
  path: string,
  method: string,
  req: Request,
  userId: string,
  tenantId: string,
): Promise<Response> {
  const route = ROUTES[path];
  if (!route || route.method !== method) {
    return jsonResponse({ error: "Not found" }, 404);
  }

  const rl = await checkRateLimit(userId, RATE_LIMITS[route.rateLimit]);
  if (!rl.allowed) {
    return rateLimitExceededResponse(_requestOrigin, rl);
  }

  return route.handler(req, userId, tenantId);
}

// ──────────────────────────────────────────────────────────
// Server
// ──────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight — uses shared fail-closed origin validation
  if (req.method === "OPTIONS") {
    return handlePreflight(req);
  }

  _requestOrigin = req.headers.get("origin");
  const url = new URL(req.url);
  const path = url.pathname;

  // ── Auth check ──────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing or malformed Authorization header" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Tenant ID: from user metadata or fallback to user.id
  const tenantId: string = user.user_metadata?.tenant_id ?? user.id;

  // ── Route dispatch ──────────────────────────────────────
  try {
    return await dispatchRoute(path, req.method, req, user.id, tenantId);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonResponse({
        error: "Validation failed",
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      }, 400);
    }
    console.error("[byom-cockpit] Unhandled error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

// ──────────────────────────────────────────────────────────
// POST /byom/key/connect
// ──────────────────────────────────────────────────────────

async function handleConnect(
  req: Request,
  userId: string,
  tenantId: string
): Promise<Response> {
  const body = ConnectSchema.parse(await req.json());
  const { provider, auth_type, api_key } = body;

  if (!VALID_PROVIDERS.has(provider)) {
    return jsonResponse({ error: `Invalid provider: ${provider}` }, 400);
  }

  // Regex format check (early rejection)
  const pattern = API_KEY_PATTERNS[provider];
  if (pattern && !pattern.test(api_key)) {
    return jsonResponse(
      { error: `Invalid API key format for ${provider}` },
      400
    );
  }

  // ── Credential probe (validate with provider) ──────────
  const probeResult = await probeCredential(provider, api_key);
  if (!probeResult.valid) {
    return jsonResponse(
      { error: "Invalid credential", details: probeResult.reason },
      401
    );
  }

  // ── Check for existing active connection ────────────────
  const { data: existing } = await supabase
    .from("provider_connections")
    .select("connection_id")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("provider", provider)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return jsonResponse(
      {
        error: "Active connection already exists for this provider",
        details: "Revoke existing connection before adding a new one",
        existing_connection_id: existing.connection_id,
      },
      409
    );
  }

  // ── Encrypt + fingerprint + hint ────────────────────────
  const fingerprint = await cockpitCrypto.fingerprint(api_key);
  const hint = cockpitCrypto.extractHint(api_key, 4);
  const ciphertext = await cockpitCrypto.encrypt(api_key, { tenantId });

  // ── Persist to vault ────────────────────────────────────
  const { data: connection, error: insertError } = await supabase
    .from("provider_connections")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      provider,
      auth_type,
      credential_ciphertext: Array.from(ciphertext), // BYTEA as int[]
      credential_fingerprint: fingerprint,
      key_hint: hint,
      status: "active",
    })
    .select("connection_id, provider, key_hint, created_at")
    .single();

  if (insertError) {
    console.error("[byom-cockpit] Insert error:", insertError);
    return jsonResponse({ error: "Failed to store connection" }, 500);
  }

  // ── Audit log (NO SECRETS) ──────────────────────────────
  await auditLog(userId, tenantId, "byom.connect", {
    provider,
    fingerprint,
    auth_type,
  });

  return jsonResponse({ status: "connected", connection }, 201);
}

// ──────────────────────────────────────────────────────────
// POST /byom/key/rotate
// ──────────────────────────────────────────────────────────

async function handleRotate(
  req: Request,
  userId: string,
  tenantId: string
): Promise<Response> {
  const body = RotateSchema.parse(await req.json());
  const { connection_id, new_api_key } = body;

  // ── Verify ownership + tenant isolation ─────────────────
  const { data: connection, error: fetchError } = await supabase
    .from("provider_connections")
    .select("provider, auth_type, rotation_version")
    .eq("connection_id", connection_id)
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .single();

  if (fetchError || !connection) {
    return jsonResponse({ error: "Active connection not found" }, 404);
  }

  const provider = connection.provider as ByomProvider;

  // ── Validate new key format ─────────────────────────────
  const pattern = API_KEY_PATTERNS[provider];
  if (pattern && !pattern.test(new_api_key)) {
    return jsonResponse(
      { error: `Invalid API key format for ${provider}` },
      400
    );
  }

  // ── Probe new key ───────────────────────────────────────
  const probeResult = await probeCredential(provider, new_api_key);
  if (!probeResult.valid) {
    return jsonResponse(
      { error: "New credential invalid", details: probeResult.reason },
      401
    );
  }

  // ── Encrypt new credential ──────────────────────────────
  const newFingerprint = await cockpitCrypto.fingerprint(new_api_key);
  const newHint = cockpitCrypto.extractHint(new_api_key, 4);
  const newCiphertext = await cockpitCrypto.encrypt(new_api_key, { tenantId });
  const newVersion = connection.rotation_version + 1;

  // ── Update vault ────────────────────────────────────────
  const { error: updateError } = await supabase
    .from("provider_connections")
    .update({
      credential_ciphertext: Array.from(newCiphertext),
      credential_fingerprint: newFingerprint,
      key_hint: newHint,
      rotation_version: newVersion,
    })
    .eq("connection_id", connection_id)
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);

  if (updateError) {
    console.error("[byom-cockpit] Rotate error:", updateError);
    return jsonResponse({ error: "Failed to rotate credential" }, 500);
  }

  // ── Audit log ───────────────────────────────────────────
  await auditLog(userId, tenantId, "byom.rotate", {
    provider,
    new_fingerprint: newFingerprint,
    rotation_version: newVersion,
  });

  return jsonResponse({
    status: "rotated",
    connection_id,
    key_hint: newHint,
    rotation_version: newVersion,
  });
}

// ──────────────────────────────────────────────────────────
// POST /byom/key/revoke
// ──────────────────────────────────────────────────────────

async function handleRevoke(
  req: Request,
  userId: string,
  tenantId: string
): Promise<Response> {
  const body = RevokeSchema.parse(await req.json());
  const { connection_id } = body;

  // Verify ownership + tenant isolation before revocation
  const { data: connection } = await supabase
    .from("provider_connections")
    .select("provider")
    .eq("connection_id", connection_id)
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .single();

  if (!connection) {
    return jsonResponse({ error: "Active connection not found" }, 404);
  }

  const { error } = await supabase
    .from("provider_connections")
    .update({ status: "revoked" })
    .eq("connection_id", connection_id)
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[byom-cockpit] Revoke error:", error);
    return jsonResponse({ error: "Failed to revoke connection" }, 500);
  }

  await auditLog(userId, tenantId, "byom.disconnect", {
    provider: connection.provider,
    status: "revoked",
  });

  return jsonResponse({ status: "revoked", connection_id });
}

// ──────────────────────────────────────────────────────────
// GET /byom/connections
// ──────────────────────────────────────────────────────────

async function handleListConnections(userId: string, tenantId: string): Promise<Response> {
  // Query the base table (not the view) because the service_role client
  // bypasses RLS and the view relies on auth.uid() which is unavailable.
  // Explicitly select only safe columns — credential_ciphertext is EXCLUDED.
  // Both user_id AND tenant_id enforced for multi-tenant isolation.
  const { data: connections, error } = await supabase
    .from("provider_connections")
    .select("connection_id, provider, auth_type, status, key_hint, created_at, updated_at, last_used_at, token_expires_at, rotation_version")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("[byom-cockpit] List error:", error);
    return jsonResponse({ error: "Failed to fetch connections" }, 500);
  }

  return jsonResponse(
    { connections: connections ?? [] },
    200,
    { "Cache-Control": "private, no-store, max-age=0" }
  );
}

// ──────────────────────────────────────────────────────────
// Credential Probing
// ──────────────────────────────────────────────────────────

async function probeCredential(
  provider: ByomProvider,
  apiKey: string
): Promise<{ valid: boolean; reason?: string }> {
  const probeUrl = PROVIDER_PROBE_ENDPOINTS[provider];
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Provider-specific auth headers
  switch (provider) {
    case "openai":
    case "xai":
    case "groq":
      headers["Authorization"] = `Bearer ${apiKey}`;
      break;
    case "anthropic":
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      break;
    case "google":
      headers["x-goog-api-key"] = apiKey;
      break;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(probeUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) return { valid: true };
    if (response.status === 401 || response.status === 403) {
      return { valid: false, reason: "Provider rejected credential (unauthorized)" };
    }
    if (response.status === 429) return { valid: true }; // Rate limited = key IS valid

    return { valid: false, reason: `Provider returned HTTP ${response.status}` };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { valid: false, reason: "Credential probe timed out (10s)" };
    }
    return { valid: false, reason: "Unable to reach provider API" };
  }
}

// ──────────────────────────────────────────────────────────
// Audit Logging
// ──────────────────────────────────────────────────────────

async function auditLog(
  userId: string,
  tenantId: string,
  actionType: string,
  metadata: ByomAuditMetadata
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: userId,
    tenant_id: tenantId,
    action_type: actionType,
    resource_type: "provider_connection",
    metadata,
  });

  if (error) {
    console.error("[byom-cockpit] Audit log error:", error);
  }
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  const corsHeaders = buildCorsHeaders(_requestOrigin);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      ...extraHeaders,
      "Content-Type": "application/json",
    },
  });
}
