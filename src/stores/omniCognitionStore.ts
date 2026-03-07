/**
 * OmniCognition Global State — "The Memory Anchor"
 * @version 1.0.0
 * @module src/stores/omniCognitionStore
 *
 * Zustand store providing reactive access to the CognitionManager singleton.
 * Components subscribe to cognitive state changes (session entries, brain facts,
 * compression events) without directly coupling to the manager.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: recordAction() with same payload produces identical state
 * - Memory Safety: structuredClone on exports to prevent mutation leaks
 * - Modularity: Pure Zustand store — zero React dependencies
 * - Overload-Free: Compression is automatic via CognitionManager threshold
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';
import {
  CognitionManager,
  type CognitiveFact,
  type SessionEntry,
} from '@/core/cognition/CognitionManager';

// ============================================================================
// Types
// ============================================================================

export type CognitionStatus = 'idle' | 'recording' | 'compressing' | 'error';

interface OmniCognitionState {
  /** Current operational status */
  readonly status: CognitionStatus;
  /** Most recent session entries (Short-Term window) */
  readonly recentActions: readonly SessionEntry[];
  /** All brain facts (Long-Term Memory) */
  readonly brainFacts: readonly CognitiveFact[];
  /** Estimated token count across all tiers */
  readonly tokenEstimate: number;
  /** Count of active (uncompressed) session entries */
  readonly activeSessionCount: number;
  /** Timestamp of last compression */
  readonly lastCompression: string | null;

  /** Record an action in the session log */
  recordAction: (action: string, result?: string) => void;
  /** Promote a fact to long-term memory */
  promoteToBrain: (content: string, source: string) => void;
  /** Manually trigger compression */
  compress: () => number;
  /** Load state from serialized data */
  loadState: (raw: unknown) => void;
  /** Refresh derived state from the manager */
  sync: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useOmniCognition = create<OmniCognitionState>((set) => {
  const manager = CognitionManager.getInstance();

  /** Sync derived state from the CognitionManager singleton */
  const syncFromManager = (): Partial<OmniCognitionState> => ({
    recentActions: manager.getRecentActions(),
    brainFacts: manager.getBrainFacts(),
    tokenEstimate: manager.getTokenEstimate(),
    activeSessionCount: manager.getActiveSessionCount(),
    lastCompression: manager.getState().lastCompression,
  });

  return {
    status: 'idle',
    recentActions: [],
    brainFacts: [],
    tokenEstimate: 0,
    activeSessionCount: 0,
    lastCompression: null,

    recordAction: (action, result) => {
      set({ status: 'recording' });
      try {
        manager.recordAction(action, result);
        set({ status: 'idle', ...syncFromManager() });
      } catch {
        set({ status: 'error' });
      }
    },

    promoteToBrain: (content, source) => {
      manager.promoteToBrain(content, source);
      set(syncFromManager());
    },

    compress: () => {
      set({ status: 'compressing' });
      try {
        const count = manager.compress();
        set({ status: 'idle', ...syncFromManager() });
        return count;
      } catch {
        set({ status: 'error' });
        return 0;
      }
    },

    loadState: (raw) => {
      manager.load(raw);
      set(syncFromManager());
    },

    sync: () => {
      set(syncFromManager());
    },
  };
});
