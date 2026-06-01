import { describe, expect, it } from 'vitest';
import {
  APEX_POLICY_VERSION,
  assertMutationEnvelope,
  continueTraceContext,
  createExecutionEnvelope,
  deriveIntentHash,
  evaluateGuardianPolicy,
  injectTraceHeaders,
  parseTraceContext,
  structuredApexLogFields,
} from '../../src/lib/apex/control-plane';

describe('APEX execution envelope', () => {
  it('creates stable intent hash and correlation for the same user action', async () => {
    const base = { actor_id: 'user-1', device_id: 'device-1', action: 'workflow.submit', resource: 'wf:alpha', payload: { b: 2, a: 1 }, stale_after: '2099-01-01T00:00:00.000Z' };
    const first = await createExecutionEnvelope(base);
    const second = await createExecutionEnvelope({ ...base, payload: { a: 1, b: 2 } });
    expect(first.intent_hash).toBe(second.intent_hash);
    expect(first.correlation_id).toBe(second.correlation_id);
    expect(first.idempotency_key).toBe(second.idempotency_key);
  });

  it('rejects mutating requests without idempotency, intent hash, or freshness', () => {
    expect(() => assertMutationEnvelope('POST', { attempt: 1 })).toThrow('apex_envelope_invalid_trace_id');
  });

  it('fails closed on stale events', async () => {
    const envelope = await createExecutionEnvelope({ actor_id: 'user-1', device_id: 'device-1', action: 'mutate', resource: 'r', stale_after: '2020-01-01T00:00:00.000Z' });
    expect(() => assertMutationEnvelope('POST', envelope, new Date('2021-01-01T00:00:00.000Z'))).toThrow('apex_stale_event');
  });

  it('derives intent hashes independent of object key order', async () => {
    await expect(deriveIntentHash({ actor_id: 'u', device_id: 'd', action: 'a', resource: 'r', payload: { z: 1, a: [2, 3] } })).resolves.toBe(
      await deriveIntentHash({ actor_id: 'u', device_id: 'd', action: 'a', resource: 'r', payload: { a: [2, 3], z: 1 } }),
    );
  });
});

describe('Guardian policy decision fabric', () => {
  const makeEnvelope = async (deviceId = 'device-1', policyVersion: string = APEX_POLICY_VERSION) => createExecutionEnvelope({ actor_id: 'user-1', device_id: deviceId, action: 'admin.rotate_key', resource: 'secret:stripe', stale_after: '2099-01-01T00:00:00.000Z', policy_version: policyVersion as any });
  const rules = [{ id: 'apex.guardian.admin.rotate_key', effect: 'allow' as const, reason_code: 'ADMIN_CONTEXT_VALID', policy_version: APEX_POLICY_VERSION, actions: ['admin.rotate_key'], resources: ['secret:stripe'], required_context: ['mfa_verified'], allowed_device_ids: ['device-1'] }];

  it('allows when privileged context and device match', async () => {
    const decision = evaluateGuardianPolicy({ principal: 'user-1', action: 'admin.rotate_key', resource: 'secret:stripe', context: { mfa_verified: true }, envelope: await makeEnvelope(), rules });
    expect(decision).toMatchObject({ decision: 'allow', determining_policy_id: 'apex.guardian.admin.rotate_key', reason_code: 'ADMIN_CONTEXT_VALID' });
  });

  it('denies missing context path with reason code', async () => {
    const decision = evaluateGuardianPolicy({ principal: 'user-1', action: 'admin.rotate_key', resource: 'secret:stripe', context: {}, envelope: await makeEnvelope(), rules });
    expect(decision).toMatchObject({ decision: 'deny', reason_code: 'MISSING_CONTEXT' });
  });

  it('denies wrong-device path with reason code', async () => {
    const decision = evaluateGuardianPolicy({ principal: 'user-1', action: 'admin.rotate_key', resource: 'secret:stripe', context: { mfa_verified: true }, envelope: await makeEnvelope('device-2'), rules });
    expect(decision).toMatchObject({ decision: 'deny', reason_code: 'WRONG_DEVICE' });
  });

  it('denies stale-policy-version path', async () => {
    const decision = evaluateGuardianPolicy({ principal: 'user-1', action: 'admin.rotate_key', resource: 'secret:stripe', context: { mfa_verified: true }, envelope: await makeEnvelope('device-1', 'apex.policy.old'), rules, current_policy_version: APEX_POLICY_VERSION });
    expect(decision).toMatchObject({ decision: 'deny', reason_code: 'STALE_POLICY_VERSION' });
  });

  it('denies explicit deny path before default allow assumptions', async () => {
    const denyRules = [{ id: 'apex.guardian.admin.deny', effect: 'deny' as const, reason_code: 'BREAK_GLASS_REQUIRED', policy_version: APEX_POLICY_VERSION, actions: ['admin.rotate_key'] }];
    const decision = evaluateGuardianPolicy({ principal: 'user-1', action: 'admin.rotate_key', resource: 'secret:stripe', context: { mfa_verified: true }, envelope: await makeEnvelope(), rules: denyRules });
    expect(decision).toMatchObject({ decision: 'deny', determining_policy_id: 'apex.guardian.admin.deny', reason_code: 'BREAK_GLASS_REQUIRED' });
  });
});

describe('trace continuity and structured log joins', () => {
  it('continues W3C traceparent while preserving trace_id across edge and orchestrator hop', async () => {
    const browser = continueTraceContext();
    const edge = continueTraceContext(parseTraceContext({ traceparent: browser.traceparent, tracestate: 'apex=browser' }));
    const headers = injectTraceHeaders(new Headers(), edge);
    const orchestrator = parseTraceContext(headers);
    expect(orchestrator?.trace_id).toBe(browser.trace_id);
    expect(orchestrator?.traceparent).toBe(edge.traceparent);
    const envelope = await createExecutionEnvelope({ actor_id: 'user-1', device_id: 'device-1', action: 'admin.rotate_key', resource: 'secret:stripe', stale_after: '2099-01-01T00:00:00.000Z', trace_id: orchestrator?.trace_id });
    expect(structuredApexLogFields(envelope, 'duplicate')).toMatchObject({ trace_id: browser.trace_id, correlation_id: envelope.correlation_id, outcome: 'duplicate' });
  });
});

describe('Supabase RLS leakage regression contract', () => {
  it('ships fail-closed RLS policies for idempotency, compensation, and policy decisions', async () => {
    const fs = await import('node:fs');
    const sql = fs.readFileSync('supabase/migrations/20260508000000_apex_control_plane.sql', 'utf8');
    expect(sql).toContain('ALTER TABLE apex_idempotency_ledger ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE apex_policy_decisions ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('users view own apex policy decisions');
    const policyStart = sql.indexOf('CREATE POLICY "users view own apex policy decisions"');
    const policyEnd = sql.indexOf(';', policyStart);
    const browserPolicy = sql.slice(policyStart, policyEnd);
    expect(browserPolicy).toContain('TO authenticated');
    expect(browserPolicy).toContain('USING (principal = auth.uid())');
    expect(browserPolicy).not.toContain('USING (true)');
  });

  it('keeps orchestrator idempotency ledger backend-only for fresh and existing deployments', async () => {
    const fs = await import('node:fs');
    const initialSql = fs.readFileSync('supabase/migrations/20240315_idempotency_ledger.sql', 'utf8');
    const hardeningSql = fs.readFileSync('supabase/migrations/20260531000000_harden_idempotency_ledger_rls.sql', 'utf8');
    const combinedSql = `${initialSql}\n${hardeningSql}`;

    expect(initialSql).toContain('ALTER TABLE public.idempotency_ledger ENABLE ROW LEVEL SECURITY');
    expect(initialSql).toContain('ALTER TABLE public.idempotency_ledger FORCE ROW LEVEL SECURITY');
    expect(combinedSql).toContain('DROP POLICY IF EXISTS "Allow orchestrator to read and write idempotency records"');
    expect(combinedSql).toContain('REVOKE ALL ON TABLE public.idempotency_ledger FROM PUBLIC, anon, authenticated');
    expect(combinedSql).toContain('GRANT ALL ON TABLE public.idempotency_ledger TO service_role');
    expect(combinedSql).not.toContain('USING (true)');
    expect(combinedSql).not.toContain('WITH CHECK (true)');
  });
});
