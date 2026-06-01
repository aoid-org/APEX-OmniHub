import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('supabase/functions/physiomni-action/index.ts', 'utf8');

describe('physiomni-action authorization hardening', () => {
  it('requires Supabase JWT authentication before handling physical actions', () => {
    expect(source).toContain('{ requireAuth: true');
  });

  it('does not authorize dispatch from caller-supplied approval or bypass strings alone', () => {
    expect(source).not.toContain('if (!approved_by && !bypass_policy)');
    expect(source).toContain('verifyServerApproval');
    expect(source).toContain(".from('omnibridge_control_audit')");
    expect(source).toContain(".eq('state', 'approved')");
  });

  it('binds authenticated user, tenant, active device, and audit actor before dispatch', () => {
    expect(source).toContain('input.tenant_id !== userId');
    expect(source).toContain('verifyTenantDevice');
    expect(source).toContain(".from('physiomni_devices')");
    expect(source).toContain("actor_id: userId");
  });
});
