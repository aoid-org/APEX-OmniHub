/**
 * Shared OmniTrace event emitter (PRCC-001 WP-3a)
 *
 * Closes the flagship loop: action execution -> omnitrace_events -> OmniTrace panel.
 * omnilink-port.resolveOmniTrace() reads this table but nothing wrote to it, so the
 * live OmniTrace feed was permanently empty ("No events yet").
 *
 * Design invariants:
 * - Best-effort, non-blocking: a trace failure MUST NOT fail the primary action.
 * - Server-authored, append-only: written with the service-role client only.
 *   omnitrace_events RLS exposes SELECT (user_id = auth.uid()) but no INSERT policy,
 *   so users can read their own trace but never forge or mutate events.
 * - Schema-locked: severity/color_token match the CHECK constraints in
 *   migration 20260312090000_omnidash_runtime_tables.sql.
 */

// @ts-ignore: Deno-resolved import at runtime
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

export type TraceSeverity = "info" | "warning" | "error" | "success";
export type TraceColorToken = "green" | "warn" | "purple" | "red" | "cyan" | "blue";

export interface TraceEvent {
  userId: string;
  eventType: string;
  eventText: string;
  severity: TraceSeverity;
  colorToken: TraceColorToken;
}

/**
 * Insert a single OmniTrace event. Never throws — logs and swallows on failure so
 * the caller's primary operation is never impacted by observability writes.
 * @returns true if the row was written, false otherwise.
 */
export async function emitTraceEvent(
  serviceClient: SupabaseClient,
  event: TraceEvent,
): Promise<boolean> {
  try {
    const { error } = await serviceClient.from("omnitrace_events").insert({
      user_id: event.userId,
      event_type: event.eventType,
      event_text: event.eventText,
      severity: event.severity,
      color_token: event.colorToken,
    });
    if (error) {
      console.error("[omnitrace] emit failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[omnitrace] emit threw:", err instanceof Error ? err.message : String(err));
    return false;
  }
}
