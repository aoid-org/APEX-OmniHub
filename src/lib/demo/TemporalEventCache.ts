/**
 * TemporalEventCache — Pristine Offline Event Log for Demo Presentations
 *
 * When VITE_OMNI_DEMO_MODE=true, this cache provides a deterministic,
 * locally-cached temporal event log that hydrates the UI with zero
 * network requests and zero latency.
 *
 * The event log replays a realistic sequence of business events
 * (matching the demoStore.ts seed data) to demonstrate the full
 * OmniDash experience offline.
 *
 * APEX STANDARDS:
 * - Zero network dependency when demo mode is active
 * - Deterministic replay: Same sequence every time
 * - Idempotent: Multiple hydrate() calls produce identical state
 *
 * @module lib/demo/TemporalEventCache
 * @license Proprietary - APEX Business Systems Ltd.
 */

// ============================================================================
// Types
// ============================================================================

export interface TemporalEvent {
  readonly id: string;
  readonly type: string;
  readonly source: string;
  readonly timestamp: string;
  readonly data: Record<string, unknown>;
}

export interface TemporalEventCacheState {
  readonly events: TemporalEvent[];
  readonly cursor: number;
  readonly hydrated: boolean;
}

type EventListener = (event: TemporalEvent) => void;

// ============================================================================
// Seed Event Log
// ============================================================================

const DEMO_EVENT_LOG: TemporalEvent[] = [
  { id: 'te-001', type: 'session.started', source: 'omnidash', timestamp: '2026-03-20T08:00:00Z', data: { userId: 'demo-user', mode: 'executive' } },
  { id: 'te-002', type: 'kpi.updated', source: 'temporal', timestamp: '2026-03-20T08:01:00Z', data: { metric: 'flowbills_demos', value: 12, delta: 3 } },
  { id: 'te-003', type: 'pipeline.stage_changed', source: 'omniconnect', timestamp: '2026-03-20T08:02:00Z', data: { dealId: 'pipe-001', from: 'proposal', to: 'negotiation', value: 75000 } },
  { id: 'te-004', type: 'incident.created', source: 'guardian', timestamp: '2026-03-20T08:03:00Z', data: { severity: 'sev2', title: 'API latency spike detected', service: 'apex-agent' } },
  { id: 'te-005', type: 'workflow.completed', source: 'temporal', timestamp: '2026-03-20T08:05:00Z', data: { workflowId: 'lead-enrichment', duration: 5200, steps: 5 } },
  { id: 'te-006', type: 'entity.created', source: 'omnihub', timestamp: '2026-03-20T08:06:00Z', data: { entityId: 'ent-006', name: 'CloudScale Inc', type: 'lead' } },
  { id: 'te-007', type: 'task.completed', source: 'omnidash', timestamp: '2026-03-20T08:08:00Z', data: { taskId: 'task-001', title: 'Review Q1 pipeline' } },
  { id: 'te-008', type: 'approval.approved', source: 'omnidash', timestamp: '2026-03-20T08:10:00Z', data: { approvalId: 'apr-001', type: 'expense', approver: 'admin@example.com' } },
  { id: 'te-009', type: 'integration.synced', source: 'omniconnect', timestamp: '2026-03-20T08:12:00Z', data: { integration: 'stripe', records: 47, direction: 'inbound' } },
  { id: 'te-010', type: 'kpi.updated', source: 'temporal', timestamp: '2026-03-20T08:15:00Z', data: { metric: 'flowbills_paid_accounts', value: 24, delta: 1 } },
  { id: 'te-011', type: 'agent.action', source: 'apex-agent', timestamp: '2026-03-20T08:17:00Z', data: { action: 'summarize_pipeline', confidence: 0.95, tokens: 342 } },
  { id: 'te-012', type: 'memory.stored', source: 'acra', timestamp: '2026-03-20T08:18:00Z', data: { memoryType: 'episodic', importance: 0.82, topic: 'Q1 revenue projection' } },
  { id: 'te-013', type: 'incident.resolved', source: 'guardian', timestamp: '2026-03-20T08:20:00Z', data: { incidentId: 'inc-001', resolution: 'auto-scaled', ttl: '17m' } },
  { id: 'te-014', type: 'pipeline.deal_closed', source: 'omniconnect', timestamp: '2026-03-20T08:22:00Z', data: { dealId: 'pipe-004', value: 100000, client: 'Metro Systems' } },
  { id: 'te-015', type: 'session.checkpoint', source: 'omnidash', timestamp: '2026-03-20T08:25:00Z', data: { activeWidgets: 8, dataFreshness: '100%', zeroLatency: true } },
];

// ============================================================================
// TemporalEventCache Class
// ============================================================================

export class TemporalEventCache {
  private events: TemporalEvent[];
  private cursor: number;
  private _hydrated: boolean;
  private readonly listeners: Set<EventListener>;
  private replayTimer: ReturnType<typeof setInterval> | null;

  constructor() {
    this.events = [...DEMO_EVENT_LOG];
    this.cursor = 0;
    this._hydrated = false;
    this.listeners = new Set();
    this.replayTimer = null;
  }

  /**
   * Hydrates the cache, making all events available immediately.
   * Idempotent: calling multiple times has no additional effect.
   */
  hydrate(): TemporalEventCacheState {
    this._hydrated = true;
    this.cursor = this.events.length;
    return this.getState();
  }

  /**
   * Replays events one-by-one at the specified interval,
   * simulating a live temporal event stream.
   *
   * @param intervalMs - Milliseconds between events (default: 2000)
   */
  replay(intervalMs = 2000): void {
    this.stopReplay();
    this.cursor = 0;
    this._hydrated = true;

    this.replayTimer = setInterval(() => {
      if (this.cursor >= this.events.length) {
        this.stopReplay();
        return;
      }

      const event = this.events[this.cursor];
      this.cursor++;

      for (const listener of this.listeners) {
        listener(event);
      }
    }, intervalMs);
  }

  /**
   * Stops an active replay.
   */
  stopReplay(): void {
    if (this.replayTimer !== null) {
      clearInterval(this.replayTimer);
      this.replayTimer = null;
    }
  }

  /**
   * Returns the current cache state.
   */
  getState(): TemporalEventCacheState {
    return {
      events: this.events.slice(0, this.cursor),
      cursor: this.cursor,
      hydrated: this._hydrated,
    };
  }

  /**
   * Returns all events in the cache (regardless of cursor position).
   */
  getAllEvents(): readonly TemporalEvent[] {
    return this.events;
  }

  /**
   * Subscribe to new events during replay.
   */
  onEvent(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Whether the cache is hydrated (all events available).
   */
  get hydrated(): boolean {
    return this._hydrated;
  }

  /**
   * Resets the cache to initial state.
   */
  reset(): void {
    this.stopReplay();
    this.cursor = 0;
    this._hydrated = false;
    this.listeners.clear();
  }

  /**
   * Cleans up all resources.
   */
  destroy(): void {
    this.reset();
    this.events = [];
  }
}

// ============================================================================
// Singleton for Demo Mode
// ============================================================================

let _instance: TemporalEventCache | null = null;

/**
 * Returns a singleton TemporalEventCache instance.
 * Use this in demo mode to ensure a single cache across the app.
 */
export function getDemoEventCache(): TemporalEventCache {
  _instance ??= new TemporalEventCache();
  return _instance;
}

/**
 * Checks if demo mode is active via environment variable.
 */
export function isDemoModeActive(): boolean {
  return (
    import.meta !== undefined &&
    import.meta.env?.VITE_OMNI_DEMO_MODE === 'true'
  );
}
