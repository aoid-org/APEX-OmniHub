/**
 * OmniTrace surface gate.
 *
 * Proves the "OmniTrace forensic decision replay" surface is real and wired:
 *  - the page renders the panel,
 *  - the panel queries the REAL `audit_logs` table via the SITE supabase client
 *    (not a duplicate store, not the root `@/...` audit module),
 *  - the pure ordering/grouping logic behaves correctly on sample rows.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildDecisionChains,
  extractCorrelationId,
  hasLinkedChains,
  type AuditLogRow,
} from '../../apps/omnihub-site/src/lib/omniTrace';

const ROOT = resolve(__dirname, '../..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');

function row(partial: Partial<AuditLogRow> & Pick<AuditLogRow, 'id' | 'created_at'>): AuditLogRow {
  return {
    actor_id: 'user-1',
    action_type: 'action',
    resource_type: null,
    resource_id: null,
    metadata: null,
    ...partial,
  };
}

describe('OmniTrace surface is wired into the site', () => {
  it('page renders the panel', () => {
    const page = read('apps/omnihub-site/src/pages/OmniTrace.tsx');
    expect(page).toContain('OmniTracePanel');
  });

  it('panel queries the real audit_logs table via the site supabase client', () => {
    const panel = read('apps/omnihub-site/src/components/OmniTracePanel.tsx');
    // Uses the SITE supabase client (relative import), not the root @/... module.
    expect(panel).toContain("from '../lib/supabase'");
    expect(panel).toContain('import { supabase, hasSupabaseConfig }');
    expect(panel).toContain(".from('audit_logs')");
    // Must NOT pull the root audit module (would break the site build).
    expect(panel).not.toContain('@/security/auditLog');
    expect(panel).not.toContain('src/security/auditLog');
  });
});

describe('OmniTrace ordering + grouping logic', () => {
  it('orders events chronologically within a chain (oldest → newest)', () => {
    const rows: AuditLogRow[] = [
      row({ id: 'c', created_at: '2026-06-21T10:00:03Z' }),
      row({ id: 'a', created_at: '2026-06-21T10:00:01Z' }),
      row({ id: 'b', created_at: '2026-06-21T10:00:02Z' }),
    ];
    const chains = buildDecisionChains(rows);
    expect(chains).toHaveLength(1);
    expect(chains[0]!.events.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(chains[0]!.grouping).toBe('chronological');
  });

  it('groups rows that share a correlation id into one linked chain', () => {
    const rows: AuditLogRow[] = [
      row({ id: '1', created_at: '2026-06-21T10:00:01Z', metadata: { correlationId: 'trace-xyz' } }),
      row({ id: '2', created_at: '2026-06-21T10:00:05Z', metadata: { correlationId: 'trace-xyz' } }),
      row({ id: '3', created_at: '2026-06-21T10:00:09Z', metadata: { reason: 'unrelated' } }),
    ];
    const chains = buildDecisionChains(rows);
    const linked = chains.find((c) => c.grouping === 'correlation');
    expect(linked).toBeDefined();
    expect(linked!.events.map((e) => e.id)).toEqual(['1', '2']);
    expect(linked!.label).toContain('trace-xyz');
    expect(hasLinkedChains(chains)).toBe(true);
  });

  it('falls back to chronological grouping when no correlation id exists', () => {
    const rows: AuditLogRow[] = [
      row({ id: '1', created_at: '2026-06-20T09:00:00Z' }),
      row({ id: '2', created_at: '2026-06-21T09:00:00Z' }),
    ];
    const chains = buildDecisionChains(rows);
    expect(hasLinkedChains(chains)).toBe(false);
    // Two different calendar days → two timeline buckets.
    expect(chains).toHaveLength(2);
    expect(chains.every((c) => c.grouping === 'chronological')).toBe(true);
  });

  it('returns chains newest-first by earliest event', () => {
    const rows: AuditLogRow[] = [
      row({ id: 'old', created_at: '2026-06-19T09:00:00Z' }),
      row({ id: 'new', created_at: '2026-06-21T09:00:00Z' }),
    ];
    const chains = buildDecisionChains(rows);
    expect(chains[0]!.startedAt).toBe('2026-06-21T09:00:00Z');
  });

  it('extractCorrelationId recognises known keys and ignores empty/missing', () => {
    expect(extractCorrelationId(row({ id: 'x', created_at: 'now', metadata: { trace_id: 't1' } }))).toBe('t1');
    expect(extractCorrelationId(row({ id: 'x', created_at: 'now', metadata: { correlationId: '  ' } }))).toBeNull();
    expect(extractCorrelationId(row({ id: 'x', created_at: 'now', metadata: null }))).toBeNull();
    expect(extractCorrelationId(row({ id: 'x', created_at: 'now', metadata: { reason: 'nope' } }))).toBeNull();
  });

  it('handles an empty event set without throwing', () => {
    expect(buildDecisionChains([])).toEqual([]);
  });
});
