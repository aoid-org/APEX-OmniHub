/**
 * Skill entitlement migration — contract tests.
 *
 * No Postgres/Deno is available in this runner, so these tests assert the SQL
 * contract by static inspection of the authoritative migration:
 *   supabase/migrations/20260622000000_skill_entitlement_free_cap_5.sql
 *
 * Verifies: free cap is 5 at BOTH layers (RPC + trigger), idempotent/additive,
 * race-safe, SECURITY DEFINER + search_path preserved, trigger EXECUTE revoked,
 * PRO contract intact, and no destructive statements.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION = resolve(
  __dirname,
  '../../supabase/migrations/20260622000000_skill_entitlement_free_cap_5.sql',
);

const sql = readFileSync(MIGRATION, 'utf8');

describe('free cap migration (3 -> 5)', () => {
  it('sets the BASIC cap to 5 at both enforcement layers', () => {
    const fives = sql.match(/max_limit := 5;/g) ?? [];
    expect(fives.length).toBe(2); // check_skill_entitlement + enforce_skill_entitlement
  });

  it('contains no residual BASIC cap of 3', () => {
    expect(sql).not.toMatch(/max_limit := 3;/);
  });

  it('preserves the PRO contract (effectively unlimited)', () => {
    expect(sql).toMatch(/max_limit := 999999;/);
  });

  it('replaces both the preflight RPC and the atomic trigger function', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.check_skill_entitlement/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.enforce_skill_entitlement/);
  });

  it('keeps SECURITY DEFINER and a pinned search_path on both functions', () => {
    // Assert the contract inside each function definition block (ignore prose).
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.check_skill_entitlement[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public/,
    );
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.enforce_skill_entitlement[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = public/,
    );
  });

  it('keeps the enforcement trigger atomic / race-safe (advisory xact lock)', () => {
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/CREATE OR REPLACE TRIGGER trg_enforce_skill_entitlement/);
    expect(sql).toMatch(/BEFORE INSERT OR UPDATE OF is_active ON public\.user_generated_skills/);
  });

  it('raises LIMIT_REACHED so the edge function maps it to HTTP 402', () => {
    expect(sql).toMatch(/RAISE EXCEPTION 'LIMIT_REACHED/);
  });

  it('re-asserts the trigger-function EXECUTE lockdown', () => {
    expect(sql).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.enforce_skill_entitlement\(\)\s*\n?\s*FROM PUBLIC, anon, authenticated/,
    );
  });

  it('is additive / non-destructive (no table rewrite or data deletion)', () => {
    expect(sql).not.toMatch(/DROP TABLE/i);
    expect(sql).not.toMatch(/TRUNCATE/i);
    expect(sql).not.toMatch(/DELETE FROM/i);
    expect(sql).not.toMatch(/ALTER TABLE[^;]*DROP COLUMN/i);
  });

  it('documents that it supersedes the prior BASIC=3 migrations', () => {
    expect(sql).toMatch(/SUPERSEDES/i);
    expect(sql).toMatch(/20260214000001_skill_forge_protocol\.sql/);
    expect(sql).toMatch(/20260610000000_skill_entitlement_db_enforcement\.sql/);
  });
});
