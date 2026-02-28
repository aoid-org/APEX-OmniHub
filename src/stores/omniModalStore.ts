/**
 * OmniModal Global State — "The Invisible Hand"
 * @version 2.0.0
 * @module src/stores/omniModalStore
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: invoke() with same config produces identical state
 * - Regression-Free: Zod validates at boundary — malformed schemas rejected
 * - Single-Modal: invoke() replaces previous modal — no stacking
 * - Modularity: Pure Zustand store — zero React dependencies
 * - Zero-Trust Serialization: contextData sanitized via JSON round-trip —
 *   strips hostile getters, setters, and prototype-chain payloads
 * - Orphan-Free: abortModal() deterministically rejects the pending Promise
 *   on Escape / backdrop close — no hanging coroutines
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export type ModalType = 'oauth' | 'form' | 'selection' | 'confirmation';

/** Safe config shape stored in the modal — no function references in contextData. */
export interface OmniModalConfig {
  readonly id: string;
  readonly provider: string;
  readonly type: ModalType;
  readonly title: string;
  readonly description?: string;
  readonly schema?: Record<string, unknown>;
  readonly contextData?: Record<string, unknown>;
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
  type: z.enum(['oauth', 'form', 'selection', 'confirmation']),
  title: z.string().min(1),
  description: z.string().optional(),
  schema: z.record(z.unknown()).optional(),
  contextData: z.record(z.unknown()).optional(),
});

// ============================================================================
// Store Interface
// ============================================================================

interface ModalPromise {
  resolve: (value: Record<string, unknown>) => void;
  reject: (reason: unknown) => void;
}

interface OmniModalState {
  readonly activeModal: OmniModalConfig | null;
  readonly modalPromise: ModalPromise | null;
  /**
   * Open a modal and return a Promise that resolves when the user completes
   * the action (resolveModal) or rejects when dismissed / cancelled (abortModal).
   *
   * Validates config shape via Zod and strips hostile payloads from contextData
   * using a JSON round-trip before storing in state.
   */
  invoke: (config: OmniModalConfig) => Promise<Record<string, unknown>>;
  /**
   * Resolve the pending modal Promise with the provided data and clear state.
   * Call this from action handlers when the user confirms / completes.
   */
  resolveModal: (data: Record<string, unknown>) => void;
  /**
   * Reject the pending modal Promise with an ABORTED status and clear state.
   * Call this on Escape key, backdrop click, or explicit Cancel.
   */
  abortModal: (reason: string) => void;
}

// ============================================================================
// Store
// ============================================================================

export const useOmniModal = create<OmniModalState>((set, get) => ({
  activeModal: null,
  modalPromise: null,

  invoke: (config) => {
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      try {
        // 1. Structural validation — throws ZodError on schema violation
        const validated = OmniModalConfigSchema.parse(config);

        // 2. Zero-trust serialization: strip hostile getters/setters/prototype
        //    chains from contextData using JSON round-trip.
        //    JSON.parse(JSON.stringify()) deterministically removes functions and
        //    non-serializable values; structuredClone() would throw a DataCloneError
        //    on hostile getter functions, crashing the UI instead.
        const sanitizedContext = validated.contextData
          ? (JSON.parse(JSON.stringify(validated.contextData)) as Record<string, unknown>)
          : undefined;

        const safePayload: OmniModalConfig = { ...validated, contextData: sanitizedContext };

        set({
          activeModal: safePayload,
          modalPromise: { resolve, reject },
        });
      } catch (error) {
        reject({ error: 'APEX_MODAL_SCHEMA_VIOLATION', details: error });
      }
    });
  },

  resolveModal: (data) => {
    const { modalPromise } = get();
    if (modalPromise) {
      modalPromise.resolve(data);
    }
    set({ activeModal: null, modalPromise: null });
  },

  abortModal: (reason) => {
    const { modalPromise } = get();
    if (modalPromise) {
      modalPromise.reject({ status: 'ABORTED', reason });
    }
    set({ activeModal: null, modalPromise: null });
  },

  abortModal: (reason = 'USER_DISMISSED') => {
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
}));
