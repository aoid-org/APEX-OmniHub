/**
 * ============================================================
 * BYOM Cockpit API — Phase 1 Edge Function
 * ============================================================
 *
 * Project:    APEX OmniHub — Project COCKPIT (BYOM Architecture)
 * Module:     byom-cockpit
 * Version:    1.0.0
 * Date:       2026-02-17
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
 * Security:
 *   - service_role client for DB mutations (bypasses RLS)
 *   - auth.uid() verified for every request
 *   - Credential probed against provider before storage
 *   - Audit: all actions logged to audit_logs with NO SECRETS
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCockpitCrypto } from "../_shared/cockpit-crypto.ts";
import type {
  ByomProvider,
  ByomAuditMetadata,
} from "../_shared/types/byom.ts";

// ──────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────

/** service_role client — bypasses RLS for credential mutations */
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const cockpitCrypto = getCockpitCrypto();

/** Provider validation endpoints (used for credential probing) */
const PROVIDER_PROBE_ENDPOINTS: Record<ByomProvider, string> = {
  openai: "https://api.openai.com/v1/models?limit=1",
  anthropic: "https://api.anthropic.com/v1/models?limit=1",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  xai: "https://api.x.ai/v1/models",
};

/** API key format regex per provider (early rejection of malformed keys) */
const API_KEY_PATTERNS: Record<ByomProvider, RegExp> = {
  openai: /^sk-[A-Za-z0-9_-]{20,}$/,
  anthropic: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
  google: /^AI[A-Za-z0-9_-]{20,}$/,
  xai: /^xai-[A-Za-z0-9_-]{20,}$/,
};

/** Allowed providers (Chinese-origin excluded) */
const VALID_PROVIDERS: ReadonlySet<ByomProvider> = new Set<ByomProvider>([
  "openai",
  "google",
  "anthropic",
  "xai",
]);

// ──────────────────────────────────────────────────────────
// Server
// ──────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // ── Auth check ──────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // Tenant ID: from user metadata or fallback to user.id
  const tenantId: string = user.user_metadata?.tenant_id ?? user.id;

  // ── Route dispatch ──────────────────────────────────────
  try {
    if (path === "/byom/key/connect" && req.method === "POST") {
      return await handleConnect(req, user.id, tenantId);
    }
    if (path === "/byom/key/rotate" && req.method === "POST") {
      return await handleRotate(req, user.id, tenantId);
    }
    if (path === "/byom/key/revoke" && req.method === "POST") {
      return await handleRevoke(req, user.id, tenantId);
    }
    if (path === "/byom/connections" && req.method === "GET") {
      return await handleListConnections(user.id);
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
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
  const body = await req.json();
  const { provider, auth_type, api_key } = body;

  // ── Input validation ────────────────────────────────────
  if (!provider || !auth_type || !api_key) {
    return jsonResponse(
      { error: "Missing required fields: provider, auth_type, api_key" },
      400
    );
  }

  if (!VALID_PROVIDERS.has(provider)) {
    return jsonResponse({ error: `Invalid provider: ${provider}` }, 400);
  }

  // Regex format check (early rejection)
  const pattern = API_KEY_PATTERNS[provider as ByomProvider];
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
      {
        error: "Invalid credential",
        details: probeResult.reason,
      },
      401
    );
  }

  // ── Check for existing active connection ────────────────
  const { data: existing } = await supabase
    .from("provider_connections")
    .select("connection_id")
    .eq("user_id", userId)
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
  const body = await req.json();
  const { connection_id, new_api_key } = body;

  if (!connection_id || !new_api_key) {
    return jsonResponse(
      { error: "Missing required fields: connection_id, new_api_key" },
      400
    );
  }

  // ── Verify ownership ────────────────────────────────────
  const { data: connection, error: fetchError } = await supabase
    .from("provider_connections")
    .select("provider, auth_type, rotation_version")
    .eq("connection_id", connection_id)
    .eq("user_id", userId)
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
    .eq("connection_id", connection_id);

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
  const body = await req.json();
  const { connection_id } = body;

  if (!connection_id) {
    return jsonResponse({ error: "Missing connection_id" }, 400);
  }

  // Verify ownership before revocation
  const { data: connection } = await supabase
    .from("provider_connections")
    .select("provider")
    .eq("connection_id", connection_id)
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (!connection) {
    return jsonResponse({ error: "Active connection not found" }, 404);
  }

  const { error } = await supabase
    .from("provider_connections")
    .update({ status: "revoked" })
    .eq("connection_id", connection_id)
    .eq("user_id", userId);

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

async function handleListConnections(_userId: string): Promise<Response> {
  // Use the safe view (excludes credential_ciphertext)
  const { data: connections, error } = await supabase
    .from("user_provider_connections_safe")
    .select("*");

  if (error) {
    console.error("[byom-cockpit] List error:", error);
    return jsonResponse({ error: "Failed to fetch connections" }, 500);
  }

  return jsonResponse({ connections: connections ?? [] });
}

// ──────────────────────────────────────────────────────────
// Credential Probing
// ──────────────────────────────────────────────────────────

/**
 * Validate a credential by probing the provider's API.
 * Returns { valid: true } if the provider accepts the credential,
 * or { valid: false, reason } if rejected.
 */
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
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(probeUrl, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401 || response.status === 403) {
      return { valid: false, reason: "Provider rejected credential (unauthorized)" };
    }

    // 429 = rate limited but key IS valid
    if (response.status === 429) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `Provider returned HTTP ${response.status}`,
    };
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

/**
 * Insert audit log entry. Metadata MUST NOT contain secrets
 * (enforced by DB constraint audit_logs_no_secrets).
 */
async function auditLog(
  userId: string,
  _tenantId: string,
  actionType: string,
  metadata: ByomAuditMetadata
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    actor_id: userId,
    action_type: actionType,
    resource_type: "provider_connection",
    metadata,
  });

  if (error) {
    // Log but don't fail the request for audit failures
    console.error("[byom-cockpit] Audit log error:", error);
  }
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
