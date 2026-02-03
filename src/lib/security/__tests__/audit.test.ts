/* VALUATION_IMPACT: Validates audit schema for compliance confidence */
/* Generated: 2026-02-03 */
import { describe, expect, it } from 'vitest';
import { AuditAction, isValidAuditEntry } from '@/lib/security/audit.interface';

describe('AuditEntry guard', () => {
  const baseEntry = {
    actorId: '550e8400-e29b-41d4-a716-446655440000',
    action: AuditAction.CREATE,
    resourceId: 'workflow:550e8400-e29b-41d4-a716-446655440001',
    timestamp: new Date(),
    metadata: { detail: 'started' },
    riskScore: 2 as 0 | 1 | 2 | 3 | 4
  };

  it('accepts valid entries', () => {
    expect(isValidAuditEntry(baseEntry)).toBe(true);
  });

  it('rejects invalid actorId', () => {
    expect(isValidAuditEntry({ ...baseEntry, actorId: 'invalid' })).toBe(false);
  });

  it('rejects invalid riskScore', () => {
    expect(isValidAuditEntry({ ...baseEntry, riskScore: 7 as 0 | 1 | 2 | 3 | 4 })).toBe(false);
  });

  it('rejects missing resourceId', () => {
    const { resourceId, ...partial } = baseEntry;
    expect(isValidAuditEntry(partial as unknown)).toBe(false);
  });

  it('rejects malformed metadata', () => {
    expect(isValidAuditEntry({ ...baseEntry, metadata: { nested: () => null } })).toBe(false);
  });
});
