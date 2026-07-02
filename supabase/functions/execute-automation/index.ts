/* eslint-disable @typescript-eslint/ban-ts-comment */
// deno-lint-ignore-file no-import-prefix require-await
/**
 * Execute Automation Edge Function
 *
 * Executes automation actions based on configuration.
 * Supports: send_email, create_record, webhook, notification
 *
 * Security:
 * - UUID validation for automationId
 * - Table allowlist for SQL injection prevention
 * - URL validation for webhooks (no internal IPs)
 * - Timeout protection for external calls
 *
 * Author: APEX CTO
 * Date: 2026-01-25
 */

// @ts-ignore: Deno imports are not recognized by standard TS
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, authenticateUser } from "../_shared/auth.ts";
import { handleCors, corsJsonResponse } from "../_shared/cors.ts";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from "../_shared/rate-limit.ts";
import { executeAction, type ActionConfig, type ActionType } from "../_shared/action-executor.ts";
import { emitTraceEvent } from "../_shared/omnitrace.ts";

/** Automation record from database */
interface Automation {
  id: string;
  action_type: ActionType;
  config: ActionConfig;
  is_active: boolean;
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // PRCC-001 WP-3a fix: thread the request origin into every JSON response.
  // corsJsonResponse defaults origin=null -> buildCorsHeaders emits ACAO 'null',
  // which the browser blocks on the real POST (preflight was fine). Every handler
  // response must echo the validated origin.
  const origin = req.headers.get("origin");
  const json = (data: unknown, status = 200) => corsJsonResponse(data, status, origin);

  // Only accept POST
  if (req.method !== "POST") {
    return json(
      { error: "method_not_allowed", message: "Only POST is allowed" },
      405
    );
  }

  try {
    const supabase = createSupabaseClient();

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    const {
      success,
      user,
      error: authError,
    } = await authenticateUser(authHeader, supabase);

    if (!success || !user) {
      return json(
        {
          error: "unauthorized",
          message: authError || "Authentication failed",
        },
        401
      );
    }

    const rl = await checkRateLimit(user.id, RATE_LIMIT_CONFIGS.executeAutomation);
    if (!rl.allowed) {
      return rateLimitExceededResponse(req.headers.get("origin"), rl);
    }

    const body = await req.json();
    const { automationId } = body;

    // Validate automationId presence and type
    if (
      !automationId ||
      typeof automationId !== "string" ||
      automationId.trim().length === 0
    ) {
      return json(
        { error: "validation_error", message: "Invalid automationId" },
        400
      );
    }

    // Validate UUID format to prevent injection
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(automationId)) {
      return json(
        {
          error: "validation_error",
          message: "Invalid automationId format (must be UUID)",
        },
        400
      );
    }

    // Fetch automation
    const { data: automation, error: fetchError } = await supabase
      .from("automations")
      .select("*")
      .eq("id", automationId)
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return json(
          { error: "not_found", message: "Automation not found" },
          404
        );
      }
      throw fetchError;
    }

    const typedAutomation = automation as Automation;

    if (!typedAutomation.is_active) {
      return json(
        { error: "inactive", message: "Automation is not active" },
        400
      );
    }

    const result = await executeAction(
      typedAutomation.action_type,
      typedAutomation.config,
      supabase,
      user.id,
    );

    // Update automation execution timestamp
    await supabase
      .from("automations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", automationId)
      .eq("user_id", user.id);

    // PRCC-001 WP-3a: close the flagship loop — record the executed action in the
    // OmniTrace feed. Best-effort/non-blocking (helper never throws); server-authored
    // via the service-role client (omnitrace_events has no INSERT RLS policy).
    await emitTraceEvent(supabase, {
      userId: user.id,
      eventType: "automation.execute",
      eventText: `Automation executed: ${typedAutomation.action_type}`,
      severity: "success",
      colorToken: "green",
    });

    return json({
      success: true,
      action_type: typedAutomation.action_type,
      result,
    });
  } catch (error) {
    console.error("Automation execution error:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return json({ error: "execution_error", message }, 500);
  }
});
