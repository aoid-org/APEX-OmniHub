/**
 * APEX OmniHub - Enterprise-Grade PII Sanitization
 *
 * Security Features:
 * - 3-tier redaction strategy (Security, Financial, Analytics)
 * - ReDoS-resistant regex patterns with bounded quantifiers
 * - Circuit breakers: max depth 10, max keys 1000, 10KB string limit
 * - Fail-secure: returns empty object on DoS detection
 *
 * Author: APEX Security Team
 * Date: 2026-02-16
 */

// ============================================================================
// SECURITY CONSTANTS - Circuit Breaker Limits
// ============================================================================

const MAX_RECURSION_DEPTH = 10;
const MAX_KEYS_SCANNED = 1000;
const MAX_STRING_LENGTH = 10 * 1024; // 10KB
const REDACTED_MARKER = '[REDACTED]';
const BUCKETED_MARKER = '[BUCKETED]';

// ============================================================================
// REGEX PATTERNS - ReDoS-Resistant with Bounded Quantifiers
// ============================================================================

/**
 * Tier 1: Security-Critical PII Patterns
 */
const SECURITY_PATTERNS = {
  // Email: RFC 5321 compliant with bounded quantifiers
  email: /\b[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,10}\b/gi,

  // Phone: International formats with bounded length
  // Modified to be more specific and bounded: optional country code, optional parens, 3 digits, separator, 3 digits, separator, 4 digits
  phone: /(?:\+?1[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // SSN: xxx-xx-xxxx pattern
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,

  // Credit card: 4-digit groups (Visa, MC, Amex, Discover)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // API keys/JWT: Bearer tokens and common key patterns
  apiKey: /\b(?:Bearer\s+)?[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,

  // IPv4
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,

  // IPv6 (simplified pattern)
  ipv6: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
} as const;

/**
 * Tier 2: Financial Data Patterns (for bucketing)
 */
const FINANCIAL_PATTERNS = {
  // Dollar amounts: $X,XXX.XX with optional commas
  dollarAmount: /\$\s?\d{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?\b/g,

  // Standalone numbers that might be amounts (context-dependent)
  numericAmount: /\b\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?\b/g,
} as const;

/**
 * Sensitive field names that should always be redacted
 */
const SENSITIVE_FIELD_NAMES = [
  'password',
  'passwd',
  'secret',
  'api_key',
  'apiKey',
  'apikey',
  'access_token',
  'accessToken',
  'refresh_token',
  'refreshToken',
  'private_key',
  'privateKey',
  'auth_token',
  'authToken',
] as const;

// ============================================================================
// CIRCUIT BREAKER STATE
// ============================================================================

interface SanitizationMetrics {
  keysScanned: number;
  depth: number;
  stringsProcessed: number;
  circuitTripped: boolean;
}

// ============================================================================
// CORE SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Bucket financial amounts into privacy-preserving ranges
 */
function bucketAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return BUCKETED_MARKER;
  }
  if (amount < 250) return '<$250';
  if (amount < 500) return '$250-$500';
  if (amount < 1000) return '$500-$1k';
  if (amount < 5000) return '$1k-$5k';
  if (amount < 10000) return '$5k-$10k';
  return '$10k+';
}

/**
 * Sanitize string content (Tier 1 + Tier 2 patterns)
 */
function sanitizeString(text: string, metrics: SanitizationMetrics): string {
  // Circuit breaker: Reject strings longer than 10KB
  if (text.length > MAX_STRING_LENGTH) {
    metrics.circuitTripped = true;
    return REDACTED_MARKER;
  }

  metrics.stringsProcessed++;

  let sanitized = text;

  // Tier 1: Security-critical PII (always redact)
  sanitized = sanitized.replace(SECURITY_PATTERNS.email, REDACTED_MARKER);
  sanitized = sanitized.replace(SECURITY_PATTERNS.phone, REDACTED_MARKER);
  sanitized = sanitized.replace(SECURITY_PATTERNS.ssn, REDACTED_MARKER);
  sanitized = sanitized.replace(SECURITY_PATTERNS.creditCard, REDACTED_MARKER);
  sanitized = sanitized.replace(SECURITY_PATTERNS.apiKey, REDACTED_MARKER);
  sanitized = sanitized.replace(SECURITY_PATTERNS.ipv4, REDACTED_MARKER);
  sanitized = sanitized.replace(SECURITY_PATTERNS.ipv6, REDACTED_MARKER);

  // Tier 2: Financial data (bucket)
  sanitized = sanitized.replace(FINANCIAL_PATTERNS.dollarAmount, BUCKETED_MARKER);

  return sanitized;
}

/**
 * Check if field name is sensitive
 */
function isSensitiveField(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_FIELD_NAMES.some(sensitive => lowerKey.includes(sensitive));
}

/**
 * Recursively sanitize object with circuit breaker protection
 */
function sanitizeObjectRecursive(
  obj: unknown,
  metrics: SanitizationMetrics,
  depth = 0
): unknown {
  // Circuit breaker: Max depth
  if (depth > MAX_RECURSION_DEPTH) {
    metrics.circuitTripped = true;
    return '[MAX_DEPTH_EXCEEDED]';
  }

  // Circuit breaker: Max keys
  if (metrics.keysScanned > MAX_KEYS_SCANNED) {
    metrics.circuitTripped = true;
    return '[MAX_KEYS_EXCEEDED]';
  }

  // Handle primitives
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, metrics);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectRecursive(item, metrics, depth + 1));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      metrics.keysScanned++;

      // Circuit breaker check
      if (metrics.keysScanned > MAX_KEYS_SCANNED) {
        metrics.circuitTripped = true;
        break;
      }

      // Redact sensitive fields entirely
      if (isSensitiveField(key)) {
        sanitized[key] = REDACTED_MARKER;
        continue;
      }

      // Recursively sanitize value
      sanitized[key] = sanitizeObjectRecursive(value, metrics, depth + 1);
    }

    return sanitized;
  }

  // Unknown type - return as-is
  return obj;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Sanitize event payload with 3-tier redaction strategy
 *
 * @param payload - Event payload to sanitize
 * @returns Sanitized payload with PII removed
 *
 * @throws Never - Fails secure by returning empty object on circuit trip
 */
export function sanitizeEventPayload<T extends Record<string, unknown>>(
  payload: T
): T {
  const metrics: SanitizationMetrics = {
    keysScanned: 0,
    depth: 0,
    stringsProcessed: 0,
    circuitTripped: false,
  };

  try {
    const sanitized = sanitizeObjectRecursive(payload, metrics, 0) as T;

    // If circuit breaker tripped, fail secure
    if (metrics.circuitTripped) {
      console.error('[SECURITY] Sanitization circuit breaker tripped', {
        keysScanned: metrics.keysScanned,
        depth: metrics.depth,
        limit: 'EXCEEDED',
      });
      return {} as T; // Fail secure - return empty object
    }

    return sanitized;
  } catch (error) {
    console.error('[SECURITY] Sanitization error', error);
    return {} as T; // Fail secure
  }
}

/**
 * Tier 1 only: Strip PII from text (for legacy compatibility)
 * @deprecated Use sanitizeEventPayload for objects
 */
export function stripPii(text: string): string {
  const metrics: SanitizationMetrics = {
    keysScanned: 0,
    depth: 0,
    stringsProcessed: 0,
    circuitTripped: false,
  };
  return sanitizeString(text, metrics);
}

/**
 * Tier 2: Bucket financial amount
 */
export function redactAmount(amount: number | null | undefined): string {
  return bucketAmount(amount);
}

/**
 * Export patterns for testing/validation
 */
export const PATTERNS = {
  SECURITY: SECURITY_PATTERNS,
  FINANCIAL: FINANCIAL_PATTERNS,
} as const;

/**
 * Export limits for testing/monitoring
 */
export const LIMITS = {
  MAX_RECURSION_DEPTH,
  MAX_KEYS_SCANNED,
  MAX_STRING_LENGTH,
} as const;
