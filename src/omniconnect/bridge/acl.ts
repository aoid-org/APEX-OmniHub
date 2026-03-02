/**
 * OmniConnect Bridge ACL — Payload Validation Gateway
 * @version 1.0.0
 * @module src/omniconnect/bridge/acl
 *
 * Validates all inbound payloads against the canonical BridgePayload schema.
 * Rejects unknown action values with a typed ParseError before dispatch.
 * Acts as the first-line defence before any state mutation occurs.
 *
 * APEX STANDARDS:
 * - Zod boundary validation — malformed payloads never reach the UI layer
 * - Anchored regex — all patterns are O(n), no catastrophic backtracking
 * - crypto.randomUUID() for correlation IDs — no Math.random()
 * - Cognitive complexity ≤ 15 per function
 * - SonarQube A-grade: no nested ternary, no nested template literals
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { z } from 'zod';

// ============================================================================
// BridgeAction enum (exhaustive)
// ============================================================================

export const BRIDGE_ACTIONS = [
  'PENDING_NETWORK',
  'PROCESSING',
  'SETTLED',
  'RECONCILED',
  'MAN_MODE_LOCKDOWN',
] as const;

export type BridgeAction = (typeof BRIDGE_ACTIONS)[number];

// ============================================================================
// BridgePayload schema (canonical)
// ============================================================================

/**
 * Anchored ISO-8601 timestamp pattern.
 * Matches: 2026-03-02T04:59:00Z or 2026-03-02T04:59:00.000Z
 * O(n) — no overlapping quantifiers.
 */
const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/**
 * Anchored decimal currency string: non-negative, two decimal places.
 * Examples: "0.00", "700.00", "10500.00"
 */
const DECIMAL_AMOUNT_RE = /^\d+\.\d{2}$/;

/**
 * Anchored Ethereum transaction hash: 0x + 64 hex chars.
 */
const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export const BridgePayloadSchema = z.object({
  /** FSM action — exhaustive union, unknown values rejected at parse time */
  action: z.enum(BRIDGE_ACTIONS),
  /** Discrepancy amount as string, two decimal places — never float */
  discrepancy: z.string().regex(DECIMAL_AMOUNT_RE, 'discrepancy must be "0.00" format'),
  /** Data source that produced this payload */
  source: z.enum(['WEB3', 'ERP', 'HYBRID']),
  /** Ethereum transaction hash (optional, present on WEB3 payloads) */
  txHash: z.string().regex(TX_HASH_RE).optional(),
  /** ERP reference identifier (optional, present on ERP payloads) */
  erpRef: z.string().min(1).optional(),
  /** ISO-8601 timestamp of the payload */
  timestamp: z.string().regex(ISO8601_RE, 'timestamp must be ISO-8601 UTC'),
  /** Anomaly description — MUST be present on MAN_MODE_LOCKDOWN */
  anomaly: z.string().min(1).optional(),
}).superRefine((val, ctx) => {
  if (val.action === 'MAN_MODE_LOCKDOWN' && !val.anomaly) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['anomaly'],
      message: 'anomaly is required when action is MAN_MODE_LOCKDOWN',
    });
  }
});

export type BridgePayload = z.infer<typeof BridgePayloadSchema>;

// ============================================================================
// ParseError
// ============================================================================

/** Typed error emitted when ACL validation fails */
export class BridgeParseError extends Error {
  constructor(
    message: string,
    readonly issues: z.ZodIssue[],
    readonly correlationId: string,
  ) {
    super(message);
    this.name = 'BridgeParseError';
    Object.setPrototypeOf(this, BridgeParseError.prototype);
  }
}

// ============================================================================
// ACL gate functions
// ============================================================================

/**
 * Validate a raw unknown payload against the BridgePayload schema.
 * Returns a typed BridgePayload or throws BridgeParseError.
 *
 * @param raw      - Untrusted inbound payload (JSON-decoded object)
 * @param correlId - Optional caller-supplied correlation ID for tracing
 */
export function validateBridgePayload(
  raw: unknown,
  correlId?: string,
): BridgePayload {
  const id = correlId ?? crypto.randomUUID();
  const result = BridgePayloadSchema.safeParse(raw);

  if (!result.success) {
    const summary = result.error.issues
      .map((i) => `[${i.path.join('.')}] ${i.message}`)
      .join('; ');

    throw new BridgeParseError(
      `BridgeACL: payload rejected — ${summary}`,
      result.error.issues,
      id,
    );
  }

  return result.data;
}

/**
 * Try-parse variant — returns null instead of throwing on failure.
 * Useful in non-throwing contexts (event handlers, effects).
 *
 * @param raw      - Untrusted inbound payload
 * @param correlId - Optional correlation ID
 */
export function tryParseBridgePayload(
  raw: unknown,
  correlId?: string,
): BridgePayload | null {
  try {
    return validateBridgePayload(raw, correlId);
  } catch {
    return null;
  }
}

/**
 * Type guard: check whether an unknown value is a valid BridgePayload.
 *
 * @param value - Value to check
 */
export function isBridgePayload(value: unknown): value is BridgePayload {
  return BridgePayloadSchema.safeParse(value).success;
}
