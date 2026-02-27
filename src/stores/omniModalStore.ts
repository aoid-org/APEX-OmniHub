/**
 * OmniModal Global State — "The Invisible Hand"
 * @version 1.0.0
 * @module src/stores/omniModalStore
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: invoke() with same config produces identical state
 * - Regression-Free: Zod validates at boundary — malformed schemas rejected
 * - Single-Modal: invoke() replaces previous modal — no stacking
 * - Modularity: Pure Zustand store — zero React dependencies
 * - Overload-Free: close() calls onCancel then resets — deterministic teardown
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export type ModalType = 'oauth' | 'form' | 'selection' | 'confirmation';

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
  onComplete: z.function(),
  onCancel: z.function().optional(),
});

// ============================================================================
// Store
// ============================================================================

interface OmniModalState {
  readonly activeModal: OmniModalConfig | null;
  readonly isOpen: boolean;
  invoke: (config: OmniModalConfig) => void;
  close: () => void;
}

export const useOmniModal = create<OmniModalState>((set, get) => ({
  activeModal: null,
  isOpen: false,

  invoke: (config) => {
    // Validate at boundary — reject malformed schemas
    const result = OmniModalConfigSchema.safeParse(config);
    if (!result.success) {
      console.error('[OmniModal] Invalid config rejected:', result.error.issues);
      return;
    }
    set({ activeModal: config, isOpen: true });
  },

  close: () => {
    const current = get().activeModal;
    if (current?.onCancel) {
      current.onCancel();
    }
    set({ isOpen: false, activeModal: null });
  },
}));
