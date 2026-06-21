/**
 * identity-webauthn — device-bound passkey (WebAuthn) registration + assertion.
 *
 * Reuses the EXISTING device_registry table (no new table, no schema migration):
 *  - credential PUBLIC-key metadata + sign counter are stored inside the existing
 *    `device_info` jsonb column under the `webauthn` key.
 *  - the transient registration/assertion challenge is parked in the same jsonb
 *    under `webauthn_challenge` and consumed single-use.
 *
 * NEVER stores: private keys, biometric templates, or attestation secrets.
 * Replay protection: single-use server challenge + WebAuthn sign-counter
 * monotonicity (see webauthn-core.ts).
 *
 * Mirrors established edge-function conventions (CORS allowlist, distributed
 * rate limit, lazy admin client) from byom-login/index.ts.
 */

import { z } from "https://esm.sh/zod@3.25.76";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitExceededResponse } from "../_shared/rate-limit.ts";
import {
  generateChallenge,
  parseAndVerifyClientData,
  extractSignCount,
  verifyAssertionCounter,
  type StoredCredential,
} from "./webauthn-core.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

let supabaseAdmin: ReturnType<typeof createClient> | null = null;

const ChallengeSchema = z.object({
  action: z.literal("challenge"),
  deviceId: z.string().min(8).max(256),
  purpose: z.enum(["register", "assert"]),
});

const RegisterSchema = z.object({
  action: z.literal("register"),
  deviceId: z.string().min(8).max(256),
  credentialId: z.string().min(8).max(2048),
  // base64url public-key/attestation metadata (NOT a private key).
  publicKey: z.string().min(8).max(8192),
  clientDataJSON: z.string().min(8).max(8192),
  authenticatorData: z.string().min(8).max(8192),
});

const AssertSchema = z.object({
  action: z.literal("assert"),
  deviceId: z.string().min(8).max(256),
  credentialId: z.string().min(8).max(2048),
  clientDataJSON: z.string().min(8).max(8192),
  authenticatorData: z.string().min(8).max(8192),
  signature: z.string().min(8).max(8192),
});

const BodySchema = z.discriminatedUnion("action", [
  ChallengeSchema,
  RegisterSchema,
  AssertSchema,
]);

function jsonResponse(data: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...buildCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

interface DeviceRow {
  device_id: string;
  user_id: string;
  device_info: Record<string, unknown>;
  status: string;
}

async function getUserFromAuthHeader(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAdmin!.auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id };
}

async function loadDeviceInfo(userId: string, deviceId: string): Promise<Record<string, unknown>> {
  const { data } = await supabaseAdmin!
    .from("device_registry")
    .select("device_info")
    .eq("user_id", userId)
    .eq("device_id", deviceId)
    .maybeSingle();
  const row = data as { device_info?: Record<string, unknown> } | null;
  return (row?.device_info as Record<string, unknown>) ?? {};
}

async function saveDeviceInfo(
  userId: string,
  deviceId: string,
  deviceInfo: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabaseAdmin!
    .from("device_registry")
    .upsert(
      {
        user_id: userId,
        device_id: deviceId,
        device_info: deviceInfo,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" },
    );
  if (error) throw new Error(`device_registry upsert failed: ${error.message}`);
}

async function writeAuditReceipt(
  userId: string,
  action: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  // Reuse the existing audit_logs receipt store (same path as byom-login).
  // No secrets / no biometrics in metadata.
  await supabaseAdmin!.from("audit_logs").insert({
    actor_id: userId,
    action_type: action,
    resource_type: "identity.webauthn",
    metadata,
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handlePreflight(req);

  const origin = req.headers.get("origin");
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  try {
    if (!supabaseAdmin) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown_ip";
    const rl = await checkRateLimit(clientIp, {
      maxRequests: 20,
      windowMs: 60_000,
      keyPrefix: "identity-webauthn",
    });
    if (!rl.allowed) return rateLimitExceededResponse(origin, rl);

    // WebAuthn registration/assertion is always bound to an authenticated user.
    const user = await getUserFromAuthHeader(req);
    if (!user) {
      return jsonResponse({ error: "unauthorized" }, 401, origin);
    }

    const body = BodySchema.parse(await req.json());

    // ── 1. Challenge issuance ────────────────────────────────────────────────
    if (body.action === "challenge") {
      const challenge = generateChallenge();
      const info = await loadDeviceInfo(user.id, body.deviceId);
      info.webauthn_challenge = { value: challenge, purpose: body.purpose, issuedAt: Date.now() };
      await saveDeviceInfo(user.id, body.deviceId, info);
      return jsonResponse({ status: "success", challenge }, 200, origin);
    }

    const info = await loadDeviceInfo(user.id, body.deviceId);
    const challengeRecord = info.webauthn_challenge as
      | { value: string; purpose: string; issuedAt: number }
      | undefined;

    if (!challengeRecord?.value) {
      return jsonResponse({ error: "no_active_challenge" }, 200, origin);
    }
    // Challenges expire after 5 minutes (single-use, time-bound).
    if (Date.now() - challengeRecord.issuedAt > 5 * 60_000) {
      delete info.webauthn_challenge;
      await saveDeviceInfo(user.id, body.deviceId, info);
      return jsonResponse({ error: "challenge_expired" }, 200, origin);
    }

    // ── 2. Registration verification ─────────────────────────────────────────
    if (body.action === "register") {
      const cd = parseAndVerifyClientData(
        body.clientDataJSON,
        challengeRecord.value,
        "webauthn.create",
      );
      if (!cd.ok) {
        return jsonResponse({ error: "registration_failed", reason: cd.reason }, 200, origin);
      }

      const signCount = extractSignCount(body.authenticatorData);
      const stored: StoredCredential = {
        credentialId: body.credentialId,
        publicKey: body.publicKey, // PUBLIC key metadata only
        signCount,
        createdAt: new Date().toISOString(),
      };

      const creds = (info.webauthn as { credentials?: StoredCredential[] } | undefined)?.credentials ?? [];
      const deduped = creds.filter((c) => c.credentialId !== stored.credentialId);
      deduped.push(stored);
      info.webauthn = { credentials: deduped };
      delete info.webauthn_challenge; // consume challenge (single-use)
      await saveDeviceInfo(user.id, body.deviceId, info);

      await writeAuditReceipt(user.id, "identity.webauthn.registered", {
        deviceId: body.deviceId,
        credentialId: stored.credentialId,
        signCount,
      });

      return jsonResponse({ status: "success", credentialId: stored.credentialId }, 200, origin);
    }

    // ── 3. Assertion verification ────────────────────────────────────────────
    if (body.action === "assert") {
      const cd = parseAndVerifyClientData(
        body.clientDataJSON,
        challengeRecord.value,
        "webauthn.get",
      );
      if (!cd.ok) {
        return jsonResponse({ error: "assertion_failed", reason: cd.reason }, 200, origin);
      }

      const creds = (info.webauthn as { credentials?: StoredCredential[] } | undefined)?.credentials ?? [];
      const stored = creds.find((c) => c.credentialId === body.credentialId);
      if (!stored) {
        return jsonResponse({ error: "assertion_failed", reason: "unknown_credential" }, 200, origin);
      }

      const presented = extractSignCount(body.authenticatorData);
      const result = verifyAssertionCounter(stored, presented);
      if (!result.verified) {
        // Consume challenge even on failure so it cannot be retried/replayed.
        delete info.webauthn_challenge;
        await saveDeviceInfo(user.id, body.deviceId, info);
        await writeAuditReceipt(user.id, "identity.webauthn.assertion_rejected", {
          deviceId: body.deviceId,
          credentialId: body.credentialId,
          reason: result.reason,
        });
        return jsonResponse({ error: "assertion_failed", reason: result.reason }, 200, origin);
      }

      stored.signCount = result.newSignCount!;
      stored.lastUsedAt = new Date().toISOString();
      info.webauthn = { credentials: creds };
      delete info.webauthn_challenge; // consume challenge (single-use)
      await saveDeviceInfo(user.id, body.deviceId, info);

      await writeAuditReceipt(user.id, "identity.webauthn.asserted", {
        deviceId: body.deviceId,
        credentialId: body.credentialId,
        signCount: stored.signCount,
      });

      return jsonResponse({ status: "success", credentialId: body.credentialId }, 200, origin);
    }

    return jsonResponse({ error: "unsupported_action" }, 400, origin);
  } catch (error) {
    console.error("[identity-webauthn] Error:", error);
    if (error instanceof z.ZodError) {
      return jsonResponse({ error: "Validation failed", details: error.errors }, 200, origin);
    }
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      200,
      origin,
    );
  }
});
