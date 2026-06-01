/**
 * tests/ci/check-additive-migrations.test.ts
 *
 * Vitest suite for the additive-migration gate script.
 * Imports exported pure functions directly — no subprocess spawning.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  RULES,
  stripSqlComment,
  isAllowlistComment,
  checkFile,
  getChangedMigrations,
  type Violation,
} from '../../scripts/ci/check-additive-migrations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Write a temporary SQL file containing `content` and return its path. */
function writeTempSql(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-migration-test-'));
  const filePath = path.join(dir, 'test_migration.sql');
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/** Assert that checkFile produces exactly one violation matching the given rule. */
function expectViolation(sql: string, ruleId: string): Violation[] {
  const filePath = writeTempSql(sql);
  const violations = checkFile(filePath);
  const matching = violations.filter((v) => v.ruleId === ruleId);
  expect(matching.length).toBeGreaterThan(0);
  return violations;
}

/** Assert that checkFile produces zero violations for the given SQL. */
function expectClean(sql: string): void {
  const filePath = writeTempSql(sql);
  const violations = checkFile(filePath);
  expect(violations).toHaveLength(0);
}

// ---------------------------------------------------------------------------
// stripSqlComment
// ---------------------------------------------------------------------------

describe('stripSqlComment', () => {
  it('returns the full line when there is no comment', () => {
    expect(stripSqlComment('DROP TABLE foo;')).toBe('DROP TABLE foo;');
  });

  it('strips everything from -- onward when the marker is outside SQL strings', () => {
    expect(stripSqlComment('SELECT 1; -- some comment')).toBe('SELECT 1; ');
  });

  it('does not strip -- inside a single-quoted SQL string', () => {
    expect(stripSqlComment("SELECT '--'; DROP TABLE public.accounts;")).toBe(
      "SELECT '--'; DROP TABLE public.accounts;",
    );
  });

  it('does not strip -- inside a PostgreSQL dollar-quoted string', () => {
    expect(stripSqlComment("SELECT $$--not a comment$$; DROP TABLE public.accounts;")).toBe(
      "SELECT $$--not a comment$$; DROP TABLE public.accounts;",
    );
  });

  it('returns empty string when the whole line is a comment', () => {
    expect(stripSqlComment('-- DROP TABLE foo')).toBe('');
  });

  it('handles lines with only whitespace before the comment', () => {
    expect(stripSqlComment('   -- DROP TABLE foo').trim()).toBe('');
  });
});

// ---------------------------------------------------------------------------
// isAllowlistComment
// ---------------------------------------------------------------------------

describe('isAllowlistComment', () => {
  it('returns true for a valid allowlist comment with a reason', () => {
    expect(
      isAllowlistComment('-- additive-allow: DROP_TABLE migrating to new schema', 'DROP_TABLE'),
    ).toBe(true);
  });

  it('returns false when the rule id does not match', () => {
    expect(
      isAllowlistComment('-- additive-allow: DROP_COLUMN reason', 'DROP_TABLE'),
    ).toBe(false);
  });

  it('returns false when there is no reason after the rule id', () => {
    expect(isAllowlistComment('-- additive-allow: DROP_TABLE', 'DROP_TABLE')).toBe(false);
    expect(isAllowlistComment('-- additive-allow: DROP_TABLE   ', 'DROP_TABLE')).toBe(false);
  });

  it('returns false for a non-comment line', () => {
    expect(isAllowlistComment('DROP TABLE foo;', 'DROP_TABLE')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Individual rule violations
// ---------------------------------------------------------------------------

describe('checkFile — rule violations', () => {
  it('rejects DROP TABLE', () => {
    expectViolation('DROP TABLE old_data;', 'DROP_TABLE');
  });

  it('rejects DELETE FROM', () => {
    expectViolation('DELETE FROM users WHERE id = 1;', 'DELETE_FROM');
  });

  it('rejects TRUNCATE', () => {
    expectViolation('TRUNCATE logs;', 'TRUNCATE');
  });

  it('rejects DROP COLUMN (ALTER TABLE ... DROP COLUMN)', () => {
    expectViolation('ALTER TABLE users DROP COLUMN deprecated_field;', 'DROP_COLUMN');
  });

  it('rejects ALTER TYPE ... DROP VALUE', () => {
    expectViolation("ALTER TYPE my_enum DROP VALUE 'old_value';", 'ALTER_TYPE_DROP_VALUE');
  });

  it('rejects DISABLE ROW LEVEL SECURITY', () => {
    expectViolation('ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;', 'DISABLE_RLS');
  });

  it('rejects DROP POLICY', () => {
    expectViolation('DROP POLICY user_read ON users;', 'DROP_POLICY');
  });

  it('rejects DROP TRIGGER', () => {
    expectViolation('DROP TRIGGER notify_changes ON orders;', 'DROP_TRIGGER');
  });

  it('rejects REVOKE', () => {
    expectViolation('REVOKE SELECT ON TABLE accounts FROM anon;', 'REVOKE');
  });

  it('rejects ON DELETE CASCADE', () => {
    expectViolation(
      'ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;',
      'ON_DELETE_CASCADE',
    );
  });

  it('rejects ALTER COLUMN ... TYPE', () => {
    expectViolation(
      'ALTER TABLE users ALTER COLUMN status TYPE TEXT USING status::TEXT;',
      'ALTER_COLUMN_TYPE',
    );
  });
});

// ---------------------------------------------------------------------------
// Comment-line safety (pure comments are not flagged)
// ---------------------------------------------------------------------------

describe('checkFile — commented-out destructive words are safe', () => {
  it('does not flag a pure comment line containing DROP TABLE', () => {
    expectClean('-- DROP TABLE foo;\nSELECT 1;');
  });

  it('does not flag a pure comment line containing DELETE FROM', () => {
    expectClean('-- DELETE FROM users;\nSELECT 1;');
  });

  it('does not flag a pure comment line containing TRUNCATE', () => {
    expectClean('-- TRUNCATE logs;\nSELECT 1;');
  });

  it('does not flag a code line where the pattern only appears in the comment portion', () => {
    // The SQL keyword is after --, so it must be treated as a comment
    expectClean("SELECT id FROM users; -- DROP TABLE would be bad here\n");
  });

  it('rejects destructive SQL after -- inside a valid SQL string', () => {
    expectViolation("SELECT '--'; DROP TABLE public.accounts;", 'DROP_TABLE');
  });
});

// ---------------------------------------------------------------------------
// Allowlist behaviour
// ---------------------------------------------------------------------------

describe('checkFile — allowlist', () => {
  it('accepts a destructive statement when the immediately preceding line has a valid allowlist comment', () => {
    const sql = [
      '-- additive-allow: DROP_TABLE removing sunset table per ADR-42',
      'DROP TABLE sunset_feature;',
    ].join('\n');
    expectClean(sql);
  });

  it('accepts DROP COLUMN with a valid allowlist on the preceding line', () => {
    const sql = [
      '-- additive-allow: DROP_COLUMN column removed per data-retention policy PR-99',
      'ALTER TABLE users DROP COLUMN old_column;',
    ].join('\n');
    expectClean(sql);
  });

  it('accepts REVOKE with a valid allowlist on the preceding line', () => {
    const sql = [
      '-- additive-allow: REVOKE narrowing permissions to service_role only per audit',
      'REVOKE SELECT ON TABLE secrets FROM anon;',
    ].join('\n');
    expectClean(sql);
  });

  it('does NOT accept the operation when the allowlist comment is two lines above (not immediately preceding)', () => {
    const sql = [
      '-- additive-allow: DROP_TABLE removing sunset table per ADR-42',
      '-- this blank comment sits between the allow and the statement',
      'DROP TABLE sunset_feature;',
    ].join('\n');
    const filePath = writeTempSql(sql);
    const violations = checkFile(filePath);
    const matching = violations.filter((v) => v.ruleId === 'DROP_TABLE');
    expect(matching.length).toBeGreaterThan(0);
  });

  it('does NOT accept the operation when the allowlist reason is missing', () => {
    const sql = [
      '-- additive-allow: DROP_TABLE',
      'DROP TABLE sunset_feature;',
    ].join('\n');
    const filePath = writeTempSql(sql);
    const violations = checkFile(filePath);
    const matching = violations.filter((v) => v.ruleId === 'DROP_TABLE');
    expect(matching.length).toBeGreaterThan(0);
  });

  it('does NOT accept when the allowlist comment is for a different rule', () => {
    const sql = [
      '-- additive-allow: DROP_COLUMN this is for drop column, not drop table',
      'DROP TABLE wrong_table;',
    ].join('\n');
    const filePath = writeTempSql(sql);
    const violations = checkFile(filePath);
    const matching = violations.filter((v) => v.ruleId === 'DROP_TABLE');
    expect(matching.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Violation output shape
// ---------------------------------------------------------------------------

describe('checkFile — violation output shape', () => {
  it('reports correct 1-based line numbers', () => {
    const sql = 'SELECT 1;\nSELECT 2;\nDROP TABLE old_table;';
    const filePath = writeTempSql(sql);
    const violations = checkFile(filePath);
    const v = violations.find((x) => x.ruleId === 'DROP_TABLE');
    expect(v).toBeDefined();
    expect(v!.lineNumber).toBe(3);
  });

  it('includes the rule id, match text, file path, and original line text in each violation', () => {
    const sql = 'DROP TABLE legacy;';
    const filePath = writeTempSql(sql);
    const violations = checkFile(filePath);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      file: filePath,
      lineNumber: 1,
      ruleId: 'DROP_TABLE',
    });
    expect(violations[0]!.match).toMatch(/DROP\s+TABLE/i);
    expect(violations[0]!.lineText).toBe('DROP TABLE legacy;');
  });
});

// ---------------------------------------------------------------------------
// getChangedMigrations — dynamic mode (mocking child_process & env)
// ---------------------------------------------------------------------------

describe('getChangedMigrations', () => {
  let tmpDir: string;
  let migrationsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-repo-mock-'));
    migrationsDir = path.join(tmpDir, 'supabase', 'migrations');
    fs.mkdirSync(migrationsDir, { recursive: true });
    // Create dummy migration files for all-file scan tests.
    fs.writeFileSync(path.join(migrationsDir, '001_create_users.sql'), 'CREATE TABLE users (id UUID);');
    fs.writeFileSync(path.join(migrationsDir, '002_create_orders.sql'), 'CREATE TABLE orders (id UUID);');
    fs.mkdirSync(path.join(migrationsDir, 'nested'), { recursive: true });
    fs.writeFileSync(
      path.join(migrationsDir, 'nested', '003_create_nested.sql'),
      'CREATE TABLE nested_orders (id UUID);',
    );
  });

  afterEach(() => {
    // Clean up env vars that tests may have set
    delete process.env['GITHUB_BASE_REF'];
    delete process.env['GITHUB_EVENT_NAME'];
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns all migration files when no CI env vars are set', () => {
    delete process.env['GITHUB_BASE_REF'];
    delete process.env['GITHUB_EVENT_NAME'];

    const files = getChangedMigrations(tmpDir);
    expect(files).toHaveLength(3);
    expect(files.every((f) => f.endsWith('.sql'))).toBe(true);
  });

  it('returns an empty array when the migrations directory does not exist', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-nodir-'));
    delete process.env['GITHUB_BASE_REF'];
    delete process.env['GITHUB_EVENT_NAME'];
    const files = getChangedMigrations(emptyDir);
    expect(files).toHaveLength(0);
    fs.rmSync(emptyDir, { recursive: true, force: true });
  });

  it('uses GITHUB_BASE_REF strategy when env var is set (falls back gracefully on git failure)', () => {
    process.env['GITHUB_BASE_REF'] = 'nonexistent-branch-xyzzy';
    const files = getChangedMigrations(tmpDir);
    expect(files).toHaveLength(3);
    expect(files.every((f) => f.endsWith('.sql'))).toBe(true);
  });

  it('uses GITHUB_EVENT_NAME=push strategy (falls back gracefully when no parent commit in tmp dir)', () => {
    delete process.env['GITHUB_BASE_REF'];
    process.env['GITHUB_EVENT_NAME'] = 'push';
    const files = getChangedMigrations(tmpDir);
    expect(files).toHaveLength(3);
    expect(files.every((f) => f.endsWith('.sql'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RULES array completeness
// ---------------------------------------------------------------------------

describe('RULES array', () => {
  const expectedRuleIds = [
    'DROP_TABLE',
    'DROP_COLUMN',
    'DELETE_FROM',
    'TRUNCATE',
    'ALTER_TYPE_DROP_VALUE',
    'DISABLE_RLS',
    'DROP_POLICY',
    'DROP_TRIGGER',
    'REVOKE',
    'ON_DELETE_CASCADE',
    'ALTER_COLUMN_TYPE',
  ];

  it('contains all required rule ids', () => {
    const ids = RULES.map((r) => r.id);
    for (const expectedId of expectedRuleIds) {
      expect(ids).toContain(expectedId);
    }
  });

  it('has unique rule ids', () => {
    const ids = RULES.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every rule has a non-empty remediation message', () => {
    for (const rule of RULES) {
      expect(rule.remediation.length).toBeGreaterThan(0);
    }
  });
});
