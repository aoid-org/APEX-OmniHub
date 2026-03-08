
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Rate Limiter Module
 * Enforces usage limits per user/tenant.
 * Reference: byom 3.md §7 (Phase 4)
 */

export class RateLimiter {
  private static readonly DEFAULT_LIMIT = 100; // requests
  private static readonly DEFAULT_WINDOW = 60; // seconds

  /**
   * Check if user is allowed to proceed.
   * Throws Error if limit exceeded.
   */
  public static async checkLimit(
    supabase: SupabaseClient,
    userId: string,
    limit = this.DEFAULT_LIMIT,
    windowSeconds = this.DEFAULT_WINDOW
  ): Promise<void> {
    
    // We utilize the Postgres RPC function for atomic/efficient count
    const { data: allowed, error } = await supabase.rpc("check_rate_limit", {
      p_user_id: userId,
      p_limit_count: limit,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error("[RateLimiter] RPC error:", error);
      // APEX principle: Fail Closed for determinism and security.
      // We throw an Error to prevent unmetered abuse during DB blips.
      throw new Error(`Rate limit check failed. Failing closed. ${error instanceof Error ? error.message : String(error)}`);
    }

    if (allowed === false) {
      throw new Error(`Rate limit exceeded (${limit} req/${windowSeconds}s)`);
    }
  }
}
