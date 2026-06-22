/**
 * OmniTrace — pure forensic ordering / grouping logic over the REAL
 * `audit_logs` table.
 *
 * This module is intentionally framework-free and side-effect-free so the
 * ordering + grouping rules can be unit-tested with sample rows. The React
 * panel (OmniTracePanel) is the only thing that performs the actual
 * RLS-scoped Supabase query; it then feeds rows through `buildDecisionChains`.
 *
 * IMPORTANT (honesty): a correlation/trace id is NOT consistently persisted
 * into `audit_logs.metadata` by the current writers (they write keys like
 * `reason`, `path`, `method`, `fingerprint`). The trace machinery in
 * `src/core/gateway/ProtocolContracts.ts#deriveTraceMeta` emits
 * `correlationId`/`requestId`/`workflowId`, but those are not written to the
 * table today. So this module DETECTS a correlation id if one is present and
 * groups by it; otherwise it falls back to a chronological timeline grouped by
 * actor + calendar day. We never claim a linked agent chain when one does not
 * exist in the data.
 */

/**
 * A row as returned from `audit_logs` (RLS-scoped to the current user).
 * Mirrors the real columns from
 * supabase/migrations/20251218000000_create_audit_logs_table.sql.
 */
export interface AuditLogRow {
  readonly id: string;
  readonly actor_id: string | null;
  readonly action_type: string;
  readonly resource_type: string | null;
  readonly resource_id: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
}

/** How a chain of events was linked together. */
export type ChainGrouping = 'correlation' | 'chronological';

export interface DecisionChain {
  /** Stable key for the chain (correlation id, or `actor::day` bucket). */
  readonly key: string;
  /** Human label describing how the chain was derived. */
  readonly label: string;
  /** How this chain's events were linked. */
  readonly grouping: ChainGrouping;
  /** Events in chronological order (oldest → newest). */
  readonly events: readonly AuditLogRow[];
  /** ISO timestamp of the earliest event in the chain. */
  readonly startedAt: string;
}

/**
 * Candidate metadata keys that, if present, indicate a real correlation id
 * linking events into a single decision chain. Ordered by preference.
 */
const CORRELATION_KEYS = [
  'correlationId',
  'correlation_id',
  'traceId',
  'trace_id',
  'requestId',
  'request_id',
  'workflowId',
  'workflow_id',
] as const;

/**
 * Extract a correlation id from a row's metadata if one of the known keys is
 * present as a non-empty string. Returns null when none is found.
 */
export function extractCorrelationId(row: AuditLogRow): string | null {
  const meta = row.metadata;
  if (!meta || typeof meta !== 'object') {
    return null;
  }
  for (const key of CORRELATION_KEYS) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function compareByCreatedAtAsc(a: AuditLogRow, b: AuditLogRow): number {
  const at = Date.parse(a.created_at);
  const bt = Date.parse(b.created_at);
  if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
  if (Number.isNaN(at)) return 1;
  if (Number.isNaN(bt)) return -1;
  if (at !== bt) return at - bt;
  // Deterministic tiebreak on id so equal timestamps order stably.
  return a.id.localeCompare(b.id);
}

/** Calendar-day bucket (UTC) used for chronological fallback grouping. */
function dayBucket(createdAt: string): string {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) {
    return 'unknown-day';
  }
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * Order events chronologically and group them into decision chains.
 *
 * - If ANY row carries a correlation id in metadata, rows that share that id
 *   are grouped into a `correlation` chain.
 * - Rows without a correlation id fall back to a `chronological` chain keyed by
 *   `actor::day` so the timeline stays readable without over-claiming linkage.
 *
 * Chains are returned newest-first (by their earliest event), and events
 * within each chain are oldest → newest.
 */
export function buildDecisionChains(rows: readonly AuditLogRow[]): DecisionChain[] {
  const ordered = [...rows].sort(compareByCreatedAtAsc);
  const chains = new Map<string, { events: AuditLogRow[]; grouping: ChainGrouping; label: string }>();

  for (const row of ordered) {
    const correlationId = extractCorrelationId(row);
    if (correlationId) {
      const key = `corr::${correlationId}`;
      const existing = chains.get(key);
      if (existing) {
        existing.events.push(row);
      } else {
        chains.set(key, {
          events: [row],
          grouping: 'correlation',
          label: `Correlation ${correlationId}`,
        });
      }
      continue;
    }

    const actor = row.actor_id ?? 'unknown-actor';
    const day = dayBucket(row.created_at);
    const key = `chron::${actor}::${day}`;
    const existing = chains.get(key);
    if (existing) {
      existing.events.push(row);
    } else {
      chains.set(key, {
        events: [row],
        grouping: 'chronological',
        label: `Timeline ${day}`,
      });
    }
  }

  const result: DecisionChain[] = [];
  for (const [key, value] of chains) {
    result.push({
      key,
      label: value.label,
      grouping: value.grouping,
      events: value.events,
      startedAt: value.events[0]?.created_at ?? '',
    });
  }

  // Newest chains first (by earliest event timestamp), descending.
  result.sort((a, b) => {
    const at = Date.parse(a.startedAt);
    const bt = Date.parse(b.startedAt);
    if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
    if (Number.isNaN(at)) return 1;
    if (Number.isNaN(bt)) return -1;
    return bt - at;
  });

  return result;
}

/** Returns true if at least one chain was linked by a real correlation id. */
export function hasLinkedChains(chains: readonly DecisionChain[]): boolean {
  return chains.some((chain) => chain.grouping === 'correlation');
}
