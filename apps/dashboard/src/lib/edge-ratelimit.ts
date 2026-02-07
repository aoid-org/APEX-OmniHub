/**
 * Server-side rate limiting for edge functions
 * Store rate limit data in memory (for single instance) or use KV store for distributed systems
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis/KV for production distributed systems)
const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check and increment rate limit for a given key
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param config - Rate limit configuration
 * @returns Rate limit result with remaining quota
 */
export function checkEdgeRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = config.keyPrefix ? `${config.keyPrefix}:${identifier}` : identifier;
  
  // Clean up expired entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  let record = rateLimitStore.get(key);

  // Initialize or reset if window expired
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  // Increment counter
  record.count++;
  rateLimitStore.set(key, record);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - record.count,
    reset: record.resetTime,
  };
}

/**
 * Generate rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  };
}

/**
 * Clear rate limit for a specific key (useful for testing or admin overrides)
 */
export function clearEdgeRateLimit(identifier: string, keyPrefix?: string): void {
  const key = keyPrefix ? `${keyPrefix}:${identifier}` : identifier;
  rateLimitStore.delete(key);
}
