/**
 * Simple client-side rate limiting utility
 * For production, implement server-side rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean expired entries
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key) || {
    count: 0,
    resetTime: now + windowMs,
  };

  if (current.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: current.resetTime - now,
    };
  }

  // Increment count
  current.count++;
  rateLimitStore.set(key, current);

  return {
    allowed: true,
    remaining: maxAttempts - current.count,
    resetIn: current.resetTime - now,
  };
}

export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
