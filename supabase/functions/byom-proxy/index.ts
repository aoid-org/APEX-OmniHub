/**
 * ============================================================
 * BYOM Proxy API — Phase 2 Edge Function
 * ============================================================
 *
 * Project:    APEX OmniHub — Project COCKPIT
 * Module:     byom-proxy
 * Version:    1.0.0
 * Date:       2026-02-17
 * Author:     APEX Engineering
 *
 * Flow:
 *   1. Auth Check (Supabase User)
 *   2. Load Credential (Decrypted from Vault)
 *   3. Pre-Flight Safety (Injection Check)
 *   4. Universal Adapter (OpenAI)
 *   5. Post-Flight Safety (PII Check)
 *   6. Stream Response (SSE)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCockpitCrypto } from "../_shared/cockpit-crypto.ts";
import { createAdapter } from "../_shared/universal-adapter.ts";
import { FlightControl } from "../_shared/flight-control.ts";
import { RateLimiter } from "../_shared/rate-limiter.ts";

// ──────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const cockpitCrypto = getCockpitCrypto();

// ──────────────────────────────────────────────────────────
// Server
// ──────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    // ── 1. Auth & Input Validation ────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) throw new Error("Unauthorized");
    const tenantId = user.user_metadata?.tenant_id ?? user.id;

    const body = await req.json();
    const { provider, model, messages } = body;

    if (!provider || !model) {
      throw new Error("Missing provider or model");
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid messages format");
    }

    // ── 2a. Rate Limiting (Phase 4) ───────────────────────
    await RateLimiter.checkLimit(supabase, user.id);

    // ── 2b. Load Credential (Decrypted from Vault) ────────
    const { data: connection } = await supabase
      .from("provider_connections")
      .select("credential_ciphertext")
      .eq("user_id", user.id)
      .eq("provider", provider)
      .eq("status", "active")
      .single();

    if (!connection) throw new Error("Provider not connected");

    // Decrypt key
    const ciphertext = new Uint8Array(connection.credential_ciphertext);
    const apiKey = await cockpitCrypto.decrypt(ciphertext, { tenantId });

    // ── 3. Pre-Flight Safety ──────────────────────────────
    const preFlight = FlightControl.preFlight(messages);
    if (!preFlight.allowed) {
      return jsonResponse(
        {
          error: "Safety Violation",
          code: preFlight.violation,
          details: "Input blocked by Flight Control",
        },
        400,
      );
    }

    // ── 4. Inference & Post-Flight (Streaming) ────────────
    const adapter = createAdapter(provider);
    let endpoint: string;

    switch (provider) {
      case "openai":
        endpoint = "https://api.openai.com/v1/chat/completions";
        break;
      case "xai":
        endpoint = "https://api.x.ai/v1/chat/completions";
        break;
      case "anthropic":
        endpoint = "https://api.anthropic.com/v1/messages";
        break;
      case "google":
        endpoint = ""; // Google adapter constructs its own URL
        break;
      default:
        throw new Error("Unknown endpoint for provider");
    }

    const stream = adapter.stream(
      messages,
      { model, max_tokens: 4000 },
      apiKey,
      endpoint,
    );

    // Create a transformative stream for post-flight checks & metering
    const encoder = new TextEncoder();
    let outputTokens = 0;

    // Estimate input tokens (rough heuristic: 4 chars = 1 token)
    const inputContent = messages.map((m) => m.content).join("");
    const inputTokens = Math.ceil(inputContent.length / 4);

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            outputTokens += Math.ceil(chunk.length / 4); // Rough estimation

            // Post-flight scan on chunk
            const safety = FlightControl.postFlight(chunk);
            const output = safety.redacted ? safety.modifiedContent! : chunk;

            const sseData = JSON.stringify({
              choices: [{ delta: { content: output } }],
            });
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // ── 5. Async Usage Metering (Phase 4) ────────────
          const region = req.headers.get("x-region") || "us";

          await supabase.from("usage_metering").insert({
            tenant_id: tenantId,
            user_id: user.id,
            provider,
            model,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            region,
          });
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[byom-proxy] Error:", error);
    const msg = error instanceof Error ? error.message : "Internal Error";
    return jsonResponse({ error: msg }, 400); // 400 so client sees it
  }
});

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
