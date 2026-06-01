import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('security hardening regressions', () => {
  it('keeps subscription activation RPC service-role only', () => {
    const migration = read('supabase/migrations/20260601000000_harden_subscription_activation_rpc.sql');

    expect(migration).toContain("COALESCE(auth.role(), '') <> 'service_role'");
    expect(migration).toMatch(/REVOKE EXECUTE ON FUNCTION public\.activate_client_subscription\([\s\S]*?FROM authenticated;/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.activate_client_subscription\([\s\S]*?TO service_role;/);
    expect(migration).toContain('SET search_path = public, pg_temp');
  });

  it('routes activate-client entitlement writes through a server-side service client', () => {
    const source = read('supabase/functions/activate-client/index.ts');

    expect(source).toContain("client.auth.getUser()");
    expect(source).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
    expect(source).toContain("adminClient.rpc('activate_client_subscription'");
    expect(source).toContain("p_user_id: user.id");
    expect(source).toContain("p_tier: 'BASIC'");
    expect(source).not.toContain('message: error instanceof Error ? error.message');
  });

  it('requires real PhysiOmni live telemetry HMAC validation instead of header presence', () => {
    const source = read('supabase/functions/physiomni-ingress/index.ts');

    expect(source).toContain('PHYSIOMNI_INGRESS_HMAC_SECRET');
    expect(source).toContain("crypto.subtle.sign('HMAC'");
    expect(source).toContain('x-physiomni-timestamp');
    expect(source).toContain('5 * 60 * 1000');
    expect(source).toContain('timingSafeEqual(provided, expected.hex)');
    expect(source).not.toContain('Placeholder for HMAC signed telemetry validation');
    expect(source).not.toContain("!isLiveEnabled || req.headers.get('x-physiomni-signature')");
  });
});
