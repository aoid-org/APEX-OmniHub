import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('supabase/functions/physiomni-action/index.ts', 'utf8');

describe('physiomni-action authorization hardening', () => {
  it('requires a Bearer token and validates it with Supabase Auth before dispatch', () => {
    expect(source).toContain("req.headers.get('Authorization')");
    expect(source).toContain('supabase.auth.getUser(token)');
    expect(source).toContain('Authentication required');
    expect(source).toContain('Invalid or expired session');
  });

  it('derives tenant and audit actor from the authenticated user', () => {
    expect(source).toContain('actorId !== tenant_id');
    expect(source).toContain('actor_id: actorId');
    expect(source).not.toContain("actor_id: 'system'");
  });

  it('checks active device ownership and server-verifiable approval before command sinks', () => {
    expect(source).toContain(".from('physiomni_devices')");
    expect(source).toContain(".eq('device_serial', device_id)");
    expect(source).toContain(".eq('tenant_id', tenant_id)");
    expect(source).toContain('hasApprovedManTask');
    expect(source).toContain('isServerApprovedBypassPolicy');
    expect(source).toContain('Action requires verified MAN approval or trusted bypass policy');
  });
});
