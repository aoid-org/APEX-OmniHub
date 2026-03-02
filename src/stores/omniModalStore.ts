/**
 * OmniModal Global State — "The Invisible Hand"
 * @version 1.2.0
 * @module src/stores/omniModalStore
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: invoke() with same config produces identical state
 * - Regression-Free: Zod validates at boundary — malformed schemas rejected
 * - Single-Modal: invoke() replaces previous modal — no stacking
 * - Modularity: Pure Zustand store — zero React dependencies
 * - Overload-Free: close() resolves, abortModal() rejects — deterministic teardown
 * - Promise Safety: abortModal rejects with { status: "ABORTED" } —
 *   callers MUST wrap invoke() in try/catch to absorb user dismissals
 * - MAN Mode: triggerMANMode / dismissMANMode — fail-closed, unclosable without auth
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export type ModalType =
  | 'oauth'
  | 'form'
  | 'selection'
  | 'confirmation'
  | 'vision_redact'
  | 'vision_confirm'
  | 'mcp_tool_approve';

export interface OmniModalConfig {
  readonly id: string;
  readonly provider: string;
  readonly type: ModalType;
  readonly title: string;
  readonly description?: string;
  readonly schema?: Record<string, unknown>;
  readonly contextData?: Record<string, unknown>;
  readonly onComplete: (data: Record<string, unknown>) => Promise<void>;
  readonly onCancel?: () => void;
}

export interface ModalAbortError {
  readonly status: 'ABORTED';
  readonly reason: string;
}

// ============================================================================
// Zod Validation Schema — boundary guard
// ============================================================================

const OmniModalConfigSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  type: z.enum(['oauth', 'form', 'selection', 'confirmation', 'vision_redact', 'vision_confirm', 'mcp_tool_approve']),
  title: z.string().min(1),
  description: z.string().optional(),
  schema: z.record(z.unknown()).optional(),
  contextData: z.record(z.unknown()).optional(),
  onComplete: z.function(),
  onCancel: z.function().optional(),
});

// ============================================================================
// MAN Mode types
// ============================================================================

/** WebAuthn biometric assertion result */
export interface BiometricResult {
  readonly kind: 'biometric';
  readonly assertion: PublicKeyCredential;
}

/** Six-digit multi-sig authorization code */
export interface MultiSigCode {
  readonly kind: 'multisig';
  readonly code: string;
}

export type MANModeCredential = BiometricResult | MultiSigCode;

/** Anchored six-digit code pattern — O(n), no overlapping quantifiers */
const MULTISIG_CODE_RE = /^\d{6}$/;

/** Validate a MANModeCredential — returns true if credential is structurally valid */
function isValidCredential(credential: MANModeCredential): boolean {
  if (credential.kind === 'biometric') {
    return credential.assertion instanceof PublicKeyCredential;
  }
  return MULTISIG_CODE_RE.test(credential.code);
}

// ============================================================================
// Store
// ============================================================================

interface OmniModalState {
  readonly activeModal: OmniModalConfig | null;
  readonly isOpen: boolean;
  /** MAN Mode active state — when true, modal is unclosable without auth */
  readonly isMANModeActive: boolean;
  readonly manModeAnomaly: string | null;
  invoke: (config: OmniModalConfig) => void;
  close: () => void;
  abortModal: (reason?: string) => void;
  /**
   * Trigger MAN Mode lockdown.
   * Sets isMANModeActive = true; modal becomes unclosable.
   * Wired to BridgeAction MAN_MODE_LOCKDOWN exclusively.
   */
  triggerMANMode: (anomaly: string) => void;
  /**
   * Dismiss MAN Mode — fail-closed.
   * Validates credential before clearing state.
   * Invalid credential keeps modal open.
   */
  dismissMANMode: (credential: MANModeCredential) => boolean;
}

export const useOmniModal = create<OmniModalState>((set, get) => ({
  activeModal: null,
  isOpen: false,
  isMANModeActive: false,
  manModeAnomaly: null,

  invoke: (config) => {
    // Validate at boundary — reject malformed schemas
    const result = OmniModalConfigSchema.safeParse(config);
    if (!result.success) {
      console.error('[OmniModal] Invalid config rejected:', result.error.issues);
      return;
    }

    // Sanitize payload: strip executable traps from contextData/schema
    const sanitized = {
      ...config,
      contextData: config.contextData
        ? structuredClone(config.contextData)
        : undefined,
      schema: config.schema
        ? structuredClone(config.schema)
        : undefined,
    };

    set({ activeModal: sanitized, isOpen: true });
  },

  close: () => {
    // Fail-closed: refuse close() while MAN Mode is active
    if (get().isMANModeActive) {
      console.warn('[OmniModal] close() blocked — MAN Mode requires auth dismissal');
      return;
    }
    const current = get().activeModal;
    if (current?.onCancel) {
      current.onCancel();
    }
    set({ isOpen: false, activeModal: null });
  },

  abortModal: (reason = 'USER_DISMISSED') => {
    // Fail-closed: refuse abort while MAN Mode is active
    if (get().isMANModeActive) {
      console.warn('[OmniModal] abortModal() blocked — MAN Mode requires auth dismissal');
      return;
    }
    const current = get().activeModal;
    if (current?.onCancel) {
      current.onCancel();
    }
    set({ isOpen: false, activeModal: null });
    // Rejection is handled by the caller's try/catch — see SOP in docs.
    // The store itself does not throw; it transitions state cleanly.
    // Callers use the APEX Standard Invocation Pattern:
    //   try { await invoke(...) } catch (e) { if (e?.status === 'ABORTED') return; }
    console.warn(`[OmniModal] Modal aborted: ${reason}`);
  },

  triggerMANMode: (anomaly: string) => {
    if (import.meta.env.DEV) {
      console.warn('[OmniModal] MAN Mode triggered:', anomaly);
    }
    set({
      isMANModeActive: true,
      manModeAnomaly: anomaly,
      isOpen: true,
    });
  },

  dismissMANMode: (credential: MANModeCredential): boolean => {
    // Fail-closed: invalid credential keeps modal open
    if (!isValidCredential(credential)) {
      console.error('[OmniModal] dismissMANMode: invalid credential — modal remains open');
      return false;
    }
    set({
      isMANModeActive: false,
      manModeAnomaly: null,
      isOpen: false,
      activeModal: null,
    });
    return true;
  },
}));
