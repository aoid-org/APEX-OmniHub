/**
 * OmniBoardStore — Connector Hydration State
 * @version 1.0.0
 * @module src/stores/omniBoardStore
 *
 * Global Zustand store that holds the live hydration state of all OmniBoard
 * connectors. Written exclusively by useOmniDashAction after successful
 * OAuth proxy exchange or spatial app launch. Read by Integrations.tsx
 * (OmniBoard) to provide instant UI reflection without waiting for a
 * React Query refetch cycle.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: hydrateConnector with same appKey replaces previous record
 * - Regression-Free: Store is append/replace only — no partial merges that can corrupt
 * - Modularity: Pure Zustand store — zero React dependencies
 * - Memory Safety: evictConnector for explicit cleanup
 * - Single Source of Truth: store state always wins over stale DB cache in UI
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type OmniBoardConnectorStatus =
  | 'LIVE'
  | 'CONNECTING'
  | 'NEEDS_AUTH'
  | 'ERROR';

export interface OmniBoardConnectorRecord {
  /** Stable connector ID returned by the backend (or fallback configId). */
  readonly id: string;
  /** Human-readable integration provider name. */
  readonly provider: string;
  /** Registry key used as the Map index. */
  readonly appKey: string;
  /** Current lifecycle status of this connector in the OmniBoard. */
  readonly status: OmniBoardConnectorStatus;
  /** Unix epoch (ms) when the proxy token expires, or null if not applicable. */
  readonly proxyTokenExpiry: number | null;
  /** Unix epoch (ms) of last successful hydration. */
  readonly syncedAt: number;
  /** Sanitized metadata from the backend — never contains raw secrets. */
  readonly metadata: Readonly<Record<string, unknown>>;
}

interface OmniBoardState {
  /** Connector records keyed by appKey for O(1) lookup. */
  readonly connectors: Readonly<Record<string, OmniBoardConnectorRecord>>;

  /**
   * Upserts a connector record. Replaces any existing record with the same
   * appKey — idempotent on repeated calls with identical payloads.
   */
  hydrateConnector: (record: OmniBoardConnectorRecord) => void;

  /**
   * Updates only the status field of an existing connector record.
   * No-op if the appKey is not found (prevents phantom records).
   */
  setConnectorStatus: (appKey: string, status: OmniBoardConnectorStatus) => void;

  /**
   * Removes a connector record. Used on sign-out or explicit disconnection.
   */
  evictConnector: (appKey: string) => void;
}

// ============================================================================
// Store
// ============================================================================

export const useOmniBoard = create<OmniBoardState>((set) => ({
  connectors: {},

  hydrateConnector: (record) =>
    set((state) => ({
      connectors: {
        ...state.connectors,
        [record.appKey]: record,
      },
    })),

  setConnectorStatus: (appKey, status) =>
    set((state) => {
      const existing = state.connectors[appKey];
      // No-op guard — do not create phantom records for unknown appKeys
      if (!existing) return state;
      return {
        connectors: {
          ...state.connectors,
          [appKey]: { ...existing, status },
        },
      };
    }),

  evictConnector: (appKey) =>
    set((state) => ({
      connectors: Object.fromEntries(
        Object.entries(state.connectors).filter(([k]) => k !== appKey),
      ),
    })),
}));
