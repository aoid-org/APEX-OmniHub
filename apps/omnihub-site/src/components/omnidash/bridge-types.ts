/**
 * Bridge Types — OmniHub Site Canonical Schema
 * @version 1.0.0
 * @module apps/omnihub-site/src/components/omnidash/bridge-types
 *
 * Self-contained type definitions for the Semantic Bridge FSM.
 * INTENTIONALLY isolated from root src/ — no cross-boundary imports.
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

// ── BridgeAction FSM states (exhaustive) ──────────────────────────────────────

export const BRIDGE_ACTIONS = [
  'PENDING_NETWORK',
  'PROCESSING',
  'SETTLED',
  'RECONCILED',
  'MAN_MODE_LOCKDOWN',
] as const;

export type BridgeAction = (typeof BRIDGE_ACTIONS)[number];

// ── BridgePayload canonical schema ────────────────────────────────────────────

export interface BridgePayload {
  /** FSM action — exhaustive; unknown values rejected at ACL boundary */
  readonly action: BridgeAction;
  /** Discrepancy amount as string with two decimal places — never float */
  readonly discrepancy: string;
  /** Data source that produced this payload */
  readonly source: 'WEB3' | 'ERP' | 'HYBRID';
  /** Ethereum transaction hash (optional) */
  readonly txHash?: string;
  /** ERP reference identifier (optional) */
  readonly erpRef?: string;
  /** ISO-8601 UTC timestamp */
  readonly timestamp: string;
  /** Anomaly description — present only on MAN_MODE_LOCKDOWN */
  readonly anomaly?: string;
}

// ── MAN Mode credential types ─────────────────────────────────────────────────

export interface BiometricResult {
  readonly kind: 'biometric';
  /** Assertion from WebAuthn navigator.credentials.get() */
  readonly assertion: PublicKeyCredential;
}

export interface MultiSigCode {
  readonly kind: 'multisig';
  /** Six-digit authorization code */
  readonly code: string;
}

export type MANModeCredential = BiometricResult | MultiSigCode;

// ── Runtime type guard ────────────────────────────────────────────────────────

const VALID_ACTIONS: ReadonlySet<string> = new Set(BRIDGE_ACTIONS);

/**
 * Type guard: check whether an unknown value is a valid BridgePayload.
 * Validates action membership; other fields validated at the ACL layer.
 */
export function isBridgePayload(value: unknown): value is BridgePayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['action'] === 'string' &&
    VALID_ACTIONS.has(v['action']) &&
    typeof v['discrepancy'] === 'string' &&
    typeof v['source'] === 'string' &&
    typeof v['timestamp'] === 'string'
  );
}
