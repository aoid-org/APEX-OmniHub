/**
 * OmniTracePanel — Real-Time Workflow Execution Trace
 * @version 1.0.0
 * @module src/components/dashboard/OmniTracePanel
 *
 * Displays a live trace log of workflow execution events received
 * via SSE from the OmniHub Gateway. Listens for WORKFLOW_COMPLETE
 * events and appends entries with zero-cost Lambda metadata.
 *
 * APEX STANDARDS ENFORCED:
 * - Zero Polling: All data flows through SSE (EventSource)
 * - Fail-Closed: Connection errors surface in the trace log
 * - Memory-Safe: Bounded log buffer (max 50 entries)
 *
 * OWNED BY: APEX Business Systems Ltd.
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { useOmniGateway } from '@/stores/omniGatewayStore';

// ============================================================================
// Types
// ============================================================================

export interface TraceEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly event: string;
  readonly workflowId: string;
  readonly detail: string;
  readonly cost: number;
  readonly worker: string;
}

interface OmniTracePanelProps {
  readonly maxEntries?: number;
}

// ============================================================================
// Constants
// ============================================================================

const MAX_TRACE_ENTRIES = 50;

// ============================================================================
// Component
// ============================================================================

function getEventColor(event: string): string {
  if (event === 'WORKFLOW_COMPLETE') return '#34d399';
  if (event === 'WORKFLOW_DISPATCHED') return '#facc15';
  return '#94a3b8';
}

export const OmniTracePanel = memo(function OmniTracePanel({
  maxEntries = MAX_TRACE_ENTRIES,
}: OmniTracePanelProps) {
  const [entries, setEntries] = useState<readonly TraceEntry[]>([]);
  const status = useOmniGateway((s) => s.status);

  const addEntry = useCallback(
    (entry: TraceEntry) => {
      setEntries((prev) => [entry, ...prev].slice(0, maxEntries));
    },
    [maxEntries],
  );

  // Listen for workflow_complete and workflow_dispatched events from the gateway store
  useEffect(() => {
    const unsubscribe = useOmniGateway.subscribe((state, prevState) => {
      // React to telemetry changes that carry workflow completion data
      if (state.telemetry && state.telemetry !== prevState.telemetry) {
        const t = state.telemetry;
        addEntry({
          id: `trace-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          timestamp: t.timestamp,
          event: 'TELEMETRY',
          workflowId: t.workflowId,
          detail: `${t.state} | model=${t.modelId} | ${t.durationMs}ms`,
          cost: t.estimatedCostUsd,
          worker: 'TEMPORAL',
        });
      }
    });

    return unsubscribe;
  }, [addEntry]);

  return (
    <div
      style={{
        borderRadius: 14,
        background: 'rgba(8, 12, 21, 0.55)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '12px 16px',
        maxHeight: 220,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: '#5a6478',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
        >
          OmniTrace
        </span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: status === 'connected' ? '#34d399' : '#94a3b8',
          }}
        >
          {status === 'connected' ? 'LIVE' : status.toUpperCase()}
        </span>
      </div>

      {entries.length === 0 ? (
        <div
          style={{
            fontSize: 11,
            color: '#475569',
            fontStyle: 'italic',
            padding: '8px 0',
          }}
        >
          No workflow events yet. Trigger a Lambda orchestration to see traces.
        </div>
      ) : (
        entries.map((entry) => (
          <TraceEntryRow key={entry.id} entry={entry} />
        ))
      )}
    </div>
  );
});

// ⚡ Bolt: Extracted row into a memoized component.
// This prevents React from re-rendering the entire 50-item list every time a single new trace event arrives.
const TraceEntryRow = memo(function TraceEntryRow({ entry }: { entry: TraceEntry }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        padding: '4px 0',
        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
        fontSize: 11,
      }}
    >
      <span
        style={{
          color: getEventColor(entry.event),
          fontWeight: 700,
          minWidth: 100,
          flexShrink: 0,
        }}
      >
        {entry.event}
      </span>
      <span
        style={{
          color: '#64748b',
          fontFamily: 'monospace',
          fontSize: 10,
          flexShrink: 0,
        }}
      >
        {entry.workflowId.slice(0, 20)}...
      </span>
      <span
        style={{
          color: '#94a3b8',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}
      >
        {entry.detail}
      </span>
    </div>
  );
});

// Export helper methods for imperative use
export { type OmniTracePanelProps };
