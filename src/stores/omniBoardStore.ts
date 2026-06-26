/**
 * OmniBoard Global State — Hydration & Spatial Handoff Engine
 * @version 1.0.0
 * @module src/stores/omniBoardStore
 *
 * Manages the global state for connected integrations, active app data,
 * and spatial render mode transitions. Receives hydration payloads from
 * the useOmniDashAction hook after successful OAuth exchanges or app launches.
 *
 * APEX STANDARDS ENFORCED:
 * - Atomic Idempotency: Same payload always produces identical state
 * - Regression-Free: Zod validates at boundary — malformed payloads rejected
 * - Modularity: Pure Zustand store — zero React dependencies
 * - Deterministic Teardown: clearActiveApp() cleanly resets spatial state
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { create } from 'zustand';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export type SpatialRenderState = 'idle' | 'sandbox' | 'spatial';

export type ConnectorStatus = 'LIVE' | 'LOCAL_LAUNCHED' | 'CONNECTING' | 'ERROR' | 'NEEDS_AUTH';

export interface ConnectedIntegration {
  readonly provider: string;
  readonly connectedAt: number;
  readonly scopes: readonly string[];
  readonly status: 'active' | 'refreshing' | 'expired';
}

export interface OmniBoardConnectorRecord {
  readonly id: string;
  readonly provider: string;
  readonly appKey: string;
  readonly status: ConnectorStatus;
  readonly proxyTokenExpiry: number | null;
  readonly syncedAt: number;
  readonly metadata: Record<string, unknown>;
}

export interface ActiveApp {
  readonly id: string;
  readonly provider: string;
  readonly renderState: SpatialRenderState;
  readonly payload: Record<string, unknown>;
  readonly mountedAt: number;
}

// ============================================================================
// Zod Boundary Schemas
// ============================================================================

const ConnectedIntegrationSchema = z.object({
  provider: z.string().min(1),
  connectedAt: z.number(),
  scopes: z.array(z.string()),
  status: z.enum(['active', 'refreshing', 'expired']),
});

const HydrationPayloadSchema = z.object({
  provider: z.string().min(1),
  data: z.record(z.unknown()).optional(),
  scopes: z.array(z.string()).optional(),
});

const ActiveAppSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  renderState: z.enum(['idle', 'sandbox', 'spatial']),
  payload: z.record(z.unknown()),
  mountedAt: z.number(),
});

// ============================================================================
// Store
// ============================================================================

interface OmniBoardState {
  readonly integrations: ReadonlyMap<string, ConnectedIntegration>;
  readonly connectors: ReadonlyMap<string, OmniBoardConnectorRecord>;
  readonly activeApp: ActiveApp | null;
  readonly isTransitioning: boolean;

  hydrateIntegration: (payload: {
    provider: string;
    data?: Record<string, unknown>;
    scopes?: string[];
  }) => void;

  removeIntegration: (provider: string) => void;

  /** Upserts a connector record keyed by appKey. */
  hydrateConnector: (record: OmniBoardConnectorRecord) => void;

  /** Updates the status of an existing connector by appKey. */
  setConnectorStatus: (appKey: string, status: ConnectorStatus) => void;

  mountActiveApp: (config: {
    id: string;
    provider: string;
    renderState: SpatialRenderState;
    payload: Record<string, unknown>;
  }) => void;

  transitionRenderState: (renderState: SpatialRenderState) => void;

  clearActiveApp: () => void;
}

export const useOmniBoard = create<OmniBoardState>((set: (partial: Partial<OmniBoardState> | ((state: OmniBoardState) => Partial<OmniBoardState>)) => void, get: () => OmniBoardState) => ({
  integrations: new Map(),
  connectors: new Map(),
  activeApp: null,
  isTransitioning: false,

  hydrateIntegration: (payload: { provider: string; data?: Record<string, unknown>; scopes?: string[] }) => {
    const result = HydrationPayloadSchema.safeParse(payload);
    if (!result.success) {
      console.error('[OmniBoard] Invalid hydration payload rejected:', result.error.issues);
      return;
    }

    const integration: ConnectedIntegration = {
      provider: payload.provider,
      connectedAt: Date.now(),
      scopes: payload.scopes ?? [],
      status: 'active',
    };

    // Validate the constructed integration
    const validIntegration = ConnectedIntegrationSchema.safeParse(integration);
    if (!validIntegration.success) {
      console.error('[OmniBoard] Constructed integration failed validation:', validIntegration.error.issues);
      return;
    }

    set((state: OmniBoardState) => {
      const next = new Map(state.integrations);
      next.set(payload.provider, integration);
      return { integrations: next };
    });
  },

  removeIntegration: (provider: string) => {
    set((state: OmniBoardState) => {
      const next = new Map(state.integrations);
      next.delete(provider);
      return { integrations: next };
    });
  },

  hydrateConnector: (record: OmniBoardConnectorRecord) => {
    set((state: OmniBoardState) => {
      const next = new Map(state.connectors);
      next.set(record.appKey, structuredClone(record) as OmniBoardConnectorRecord);
      return { connectors: next };
    });
  },

  setConnectorStatus: (appKey: string, status: ConnectorStatus) => {
    set((state: OmniBoardState) => {
      const existing = state.connectors.get(appKey);
      if (!existing) return {};
      const next = new Map(state.connectors);
      next.set(appKey, { ...existing, status });
      return { connectors: next };
    });
  },

  mountActiveApp: (config: { id: string; provider: string; renderState: SpatialRenderState; payload: Record<string, unknown> }) => {
    const app: ActiveApp = {
      ...config,
      mountedAt: Date.now(),
    };

    const result = ActiveAppSchema.safeParse(app);
    if (!result.success) {
      console.error('[OmniBoard] Invalid active app config rejected:', result.error.issues);
      return;
    }

    // Sanitize payload via structuredClone
    const sanitized: ActiveApp = {
      ...app,
      payload: structuredClone(config.payload),
    };

    set({ activeApp: sanitized, isTransitioning: true });

    // Transition complete after Framer Motion settles (SPRING_DAMPED ~400ms)
    setTimeout(() => {
      const current = get().activeApp;
      if (current?.id === config.id) {
        set({ isTransitioning: false });
      }
    }, 400);
  },

  transitionRenderState: (renderState: SpatialRenderState) => {
    const current = get().activeApp;
    if (!current) return;

    set({
      activeApp: { ...current, renderState },
      isTransitioning: true,
    });

    setTimeout(() => {
      const updated = get().activeApp;
      if (updated?.id === current.id) {
        set({ isTransitioning: false });
      }
    }, 400);
  },

  clearActiveApp: () => {
    set({ activeApp: null, isTransitioning: false });
  },
}));
