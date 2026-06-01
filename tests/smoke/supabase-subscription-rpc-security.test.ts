import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const bridgeMigration = readFileSync(
  'supabase/migrations/20260317000000_bridge_entitlements_subscriptions.sql',
  'utf8'
);
const lockdownMigration = readFileSync(
  'supabase/migrations/20260318000000_lock_down_activate_client_subscription_rpc.sql',
  'utf8'
);
const activateClientFunction = readFileSync('supabase/functions/activate-client/index.ts', 'utf8');

const activateRpcSignature =
  'public.activate_client_subscription(UUID, TEXT, JSONB, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)';

describe('activate_client_subscription RPC security', () => {
  it('does not grant elevated subscription activation to client roles', () => {
    const sql = `${bridgeMigration}\n${lockdownMigration}`;

    expect(sql).not.toMatch(
      new RegExp(`GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+${activateRpcSignature.replace(/[()]/g, '\\$&')}\\s+TO\\s+(authenticated|anon|PUBLIC)`, 'i')
    );
    expect(lockdownMigration).toContain(`REVOKE EXECUTE ON FUNCTION ${activateRpcSignature} FROM PUBLIC;`);
    expect(lockdownMigration).toContain(`REVOKE EXECUTE ON FUNCTION ${activateRpcSignature} FROM anon;`);
    expect(lockdownMigration).toContain(`REVOKE EXECUTE ON FUNCTION ${activateRpcSignature} FROM authenticated;`);
    expect(lockdownMigration).toContain(`GRANT EXECUTE ON FUNCTION ${activateRpcSignature} TO service_role;`);
  });

  it('hardens the SECURITY DEFINER function search path', () => {
    expect(lockdownMigration).toMatch(/SECURITY\s+DEFINER\s+SET\s+search_path\s+=\s+''/i);
  });

  it('keeps BASIC activation bound to the validated user before using service role', () => {
    expect(activateClientFunction).toContain('client.auth.getUser()');
    expect(activateClientFunction).toContain("Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')");
    expect(activateClientFunction).toContain('const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);');
    expect(activateClientFunction).toContain("p_user_id: user.id");
    expect(activateClientFunction).toContain("p_tier: 'BASIC'");
    expect(activateClientFunction).not.toContain("const { data, error } = await client.rpc('activate_client_subscription'");
  });
});
