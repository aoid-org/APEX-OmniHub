import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
/** SQL with `--` comment lines and trailing comments removed. */
const sqlCode = (path: string) =>
  read(path)
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .map((line) => line.replace(/\s+--\s.*$/, ''))
    .join('\n');

const MIGRATION_A = 'supabase/migrations/20260929000000_record_client_audit_event.sql';
const ROLLBACK_A = 'supabase/migrations/rollback/20260929000000_record_client_audit_event_rollback.sql';

describe('audit_logs write path (AUD-1a): migration A is additive', () => {
  const migration = read(MIGRATION_A);
  const code = sqlCode(MIGRATION_A);

  it('adds the writer as a hardened security-definer function', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.record_client_audit_event(');
    expect(migration).toContain('SECURITY DEFINER');
    expect(migration).toContain("SET search_path = ''");
    // The actor is the session user; the caller supplies no actor or timestamp.
    expect(migration).toContain('v_uid uuid := auth.uid()');
    expect(migration).not.toMatch(/p_actor|p_created_at|p_timestamp/);
    expect(migration).toContain("'source', 'client'");
    expect(migration).toContain('pg_advisory_xact_lock');
    expect(migration).toContain('ON CONFLICT (id) DO NOTHING');
  });

  it('allow-lists the browser action types and nothing else', () => {
    const listed = migration.match(/NOT IN \(([\s\S]*?)\)\s*THEN/);
    expect(listed).not.toBeNull();
    const types = [...listed![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(types).toEqual([
      'login',
      'logout',
      'omnidash.settings.updated',
      'omnilink.port.request',
      'omnilink.port.failure',
      'omnilink.port.disabled',
    ]);
    // Server-authored types stay server-only.
    expect(types).not.toContain('mcp_tool_call');
    expect(types).not.toContain('oauth_exchange');
  });

  it('grants execute to signed-in users only', () => {
    expect(code).toMatch(
      /REVOKE ALL ON FUNCTION public\.record_client_audit_event\([^)]*\) FROM PUBLIC, anon;/,
    );
    expect(code).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.record_client_audit_event\([^)]*\) TO authenticated;/,
    );
  });

  it('changes no table, privilege on a table, or policy (nothing breaks before the switch)', () => {
    expect(code).not.toMatch(/\bDROP\s+POLICY\b/i);
    expect(code).not.toMatch(/\bCREATE\s+POLICY\b/i);
    expect(code).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(code).not.toMatch(/\b(REVOKE|GRANT)\b[^;]*\bON\s+(TABLE\s+)?(public\.)?audit_logs\b/i);
    // The only REVOKE is on the new function itself.
    const revokes = code.match(/\bREVOKE\b[^;]*;/g) ?? [];
    expect(revokes).toHaveLength(1);
    expect(revokes[0]).toContain('ON FUNCTION public.record_client_audit_event(');
  });

  it('ships a rollback that only removes the function', () => {
    const rollback = sqlCode(ROLLBACK_A);
    expect(rollback.trim()).toBe(
      'DROP FUNCTION IF EXISTS public.record_client_audit_event(uuid, text, text, text, jsonb);',
    );
  });
});

describe('audit_logs write path (AUD-1a): server paths', () => {
  it('writes the apex-agent oauth_exchange audit row with the service client', () => {
    const source = read('supabase/functions/apex-agent/index.ts');
    expect(source).toContain('createServiceClient().from("audit_logs").insert({');
    expect(source).not.toMatch(/supabase\.from\("audit_logs"\)\.insert/);
    // The verified user is still the recorded actor.
    expect(source).toMatch(/actor_id: user\.id,\s*\n\s*action_type: "oauth_exchange"/);
  });
});
