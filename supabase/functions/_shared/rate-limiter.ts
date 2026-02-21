
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
      // Fail open (allow) if DB check fails to avoid outage during DB blips?
      // Or fail closed for security? 
      // APEX principle: Fail Closed for security, Fail Open for reliability if non-critical.
      // Rate limiting is non-critical for safety, but critical for cost. 
      // We'll Log and Allow to prevent blocking legitimate users on unrelated DB errors.
      return; 
    }

    if (allowed === false) {
      throw new Error(`Rate limit exceeded (${limit} req/${windowSeconds}s)`);
    }
  }
}
