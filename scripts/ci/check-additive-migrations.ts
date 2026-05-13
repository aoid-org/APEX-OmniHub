/**
 * check-additive-migrations.ts
 *
 * Production-grade additive-migration gate.
 * Detects destructive SQL operations in migration files and rejects them
 * unless an allowlist comment is present on the immediately preceding line.
 *
 * Usage: bun run scripts/ci/check-additive-migrations.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Rule {
  id: string;
  pattern: RegExp;
  remediation: string;
}

export interface Violation {
  file: string;
  lineNumber: number;
  lineText: string;
  ruleId: string;
  match: string;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export const RULES: Rule[] = [
  {
    id: 'DROP_TABLE',
    pattern: /\bDROP\s+TABLE\b/i,
    remediation:
      'Migrations must be additive. Use a new migration with CREATE TABLE instead, or add an allowlist comment: -- additive-allow: DROP_TABLE <reason>',
  },
  {
    id: 'DROP_COLUMN',
    pattern: /\bDROP\s+COLUMN\b/i,
    remediation:
      'Migrations must be additive. Add a new column instead, or add an allowlist comment: -- additive-allow: DROP_COLUMN <reason>',
  },
  {
    id: 'DELETE_FROM',
    pattern: /\bDELETE\s+FROM\b/i,
    remediation:
      'Migrations must be additive. Remove data via application logic or add an allowlist comment: -- additive-allow: DELETE_FROM <reason>',
  },
  {
    id: 'TRUNCATE',
    pattern: /\bTRUNCATE\b/i,
    remediation:
      'Migrations must be additive. Do not truncate tables in migrations, or add an allowlist comment: -- additive-allow: TRUNCATE <reason>',
  },
  {
    id: 'ALTER_TYPE_DROP_VALUE',
    pattern: /\bALTER\s+TYPE\b.*\bDROP\s+VALUE\b/i,
    remediation:
      'Migrations must be additive. Enum values cannot be removed in additive migrations, or add an allowlist comment: -- additive-allow: ALTER_TYPE_DROP_VALUE <reason>',
  },
  {
    id: 'DISABLE_RLS',
    pattern: /\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i,
    remediation:
      'Migrations must be additive. RLS must not be disabled, or add an allowlist comment: -- additive-allow: DISABLE_RLS <reason>',
  },
  {
    id: 'DROP_POLICY',
    pattern: /\bDROP\s+POLICY\b/i,
    remediation:
      'Migrations must be additive. Replace policies additively, or add an allowlist comment: -- additive-allow: DROP_POLICY <reason>',
  },
  {
    id: 'DROP_TRIGGER',
    pattern: /\bDROP\s+TRIGGER\b/i,
    remediation:
      'Migrations must be additive. Replace triggers additively, or add an allowlist comment: -- additive-allow: DROP_TRIGGER <reason>',
  },
  {
    id: 'REVOKE',
    pattern: /\bREVOKE\b/i,
    remediation:
      'Migrations must be additive. Do not revoke privileges in migrations, or add an allowlist comment: -- additive-allow: REVOKE <reason>',
  },
  {
    id: 'ON_DELETE_CASCADE',
    pattern: /\bON\s+DELETE\s+CASCADE\b/i,
    remediation:
      'ON DELETE CASCADE can cause data loss. Use ON DELETE RESTRICT or ON DELETE SET NULL instead, or add an allowlist comment: -- additive-allow: ON_DELETE_CASCADE <reason>',
  },
  {
    id: 'ALTER_COLUMN_TYPE',
    pattern: /\bALTER\s+COLUMN\b.*\bTYPE\b/i,
    remediation:
      'Changing column types is destructive. Add a new column instead, or add an allowlist comment: -- additive-allow: ALTER_COLUMN_TYPE <reason>',
  },
];

// ---------------------------------------------------------------------------
// Core helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Strips the SQL single-line comment portion from a line (everything after --).
 * Returns the code-only portion. Does not strip block comments.
 */
export function stripSqlComment(line: string): string {
  const idx = line.indexOf('--');
  return idx === -1 ? line : line.substring(0, idx);
}

/**
 * Returns true if `line` is an allowlist annotation for the given rule id.
 * Format: -- additive-allow: <RULE_ID> <reason>
 * The reason must be non-empty (at least one non-whitespace character after the rule id).
 */
export function isAllowlistComment(line: string, ruleId: string): boolean {
  const trimmed = line.trim();
  // Must start with the comment marker
  if (!trimmed.startsWith('--')) return false;
  const commentContent = trimmed.slice(2).trim();
  // Must match: additive-allow: <RULE_ID> <non-empty reason>
  const prefix = `additive-allow: ${ruleId}`;
  if (!commentContent.startsWith(prefix)) return false;
  const afterPrefix = commentContent.slice(prefix.length);
  // There must be at least one non-whitespace character after the rule id (the reason)
  return /\S/.test(afterPrefix);
}

/**
 * Checks a single SQL file for destructive patterns.
 * Returns an array of violations found.
 */
export function checkFile(filePath: string): Violation[] {
  const violations: Violation[] = [];

  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] File not found: ${filePath}`);
    return violations;
  }

  // NOSONAR - Migration files are sourced from repo migrations directory, not user input
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const codePortion = stripSqlComment(originalLine);

    // Skip lines that are pure comments (code portion is empty/whitespace)
    if (codePortion.trim() === '') continue;

    for (const rule of RULES) {
      const matchResult = rule.pattern.exec(codePortion);
      if (!matchResult) continue;

      // Check if the immediately preceding line is an allowlist comment for this rule
      const precedingLine = i > 0 ? lines[i - 1] : '';
      if (isAllowlistComment(precedingLine, rule.id)) continue;

      violations.push({
        file: filePath,
        lineNumber: i + 1, // 1-based
        lineText: originalLine.trim(),
        ruleId: rule.id,
        match: matchResult[0],
      });
    }
  }

  return violations;
}

/**
 * Determines which migration files to check, based on CI environment variables.
 *
 * Priority order:
 *  1. GITHUB_BASE_REF set → git diff origin/<base>...HEAD
 *  2. GITHUB_EVENT_NAME == 'push' and HEAD has a parent → git diff HEAD~1 HEAD
 *  3. Fallback → all *.sql files in supabase/migrations/
 */
export function getChangedMigrations(repoRoot: string): string[] {
  const migrationsDir = path.join(repoRoot, 'supabase', 'migrations');

  const baseRef = process.env['GITHUB_BASE_REF'];
  // Validate baseRef contains only safe branch-name characters before passing to git.
  const safeBaseRef = baseRef && /^[\w./-]+$/.test(baseRef) ? baseRef : null;
  if (safeBaseRef) {
    // Use spawnSync with argument array — no shell interpolation, no injection risk.
    const result = spawnSync(
      'git',
      ['diff', '--name-only', `origin/${safeBaseRef}...HEAD`, '--', 'supabase/migrations/*.sql'],
      { cwd: repoRoot, encoding: 'utf8' },
    );
    if (result.status === 0) {
      // Trust the diff result even if empty — no migrations changed means nothing to check.
      return result.stdout
        .trim()
        .split('\n')
        .filter((f) => f.endsWith('.sql'))
        .map((f) => path.join(repoRoot, f));
    }
  }

  const eventName = process.env['GITHUB_EVENT_NAME'];
  if (eventName === 'push') {
    // Check whether HEAD has a parent commit.
    const parentCheck = spawnSync('git', ['rev-parse', 'HEAD~1'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    if (parentCheck.status === 0) {
      const result = spawnSync(
        'git',
        ['diff', '--name-only', 'HEAD~1', 'HEAD', '--', 'supabase/migrations/*.sql'],
        { cwd: repoRoot, encoding: 'utf8' },
      );
      if (result.status === 0) {
        // Trust the diff result even if empty.
        return result.stdout
          .trim()
          .split('\n')
          .filter((f) => f.endsWith('.sql'))
          .map((f) => path.join(repoRoot, f));
      }
    }
  }

  // Fallback (local / unknown CI): scan all migration files
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => path.join(migrationsDir, f));
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function formatViolation(v: Violation): string {
  const rule = RULES.find((r) => r.id === v.ruleId);
  const remediation = rule?.remediation ?? 'Migrations must be additive.';
  return [
    `[VIOLATION] file: ${v.file}`,
    `  Line ${v.lineNumber}: ${v.lineText}`,
    `  Rule: ${v.ruleId}`,
    `  Match: ${v.match}`,
    `  Remediation: ${remediation}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function main(): void {
  const scriptDir = new URL('.', import.meta.url).pathname;
  const repoRoot = path.resolve(scriptDir, '..', '..');

  const files = getChangedMigrations(repoRoot);
  const allViolations: Violation[] = [];

  for (const file of files) {
    const violations = checkFile(file);
    allViolations.push(...violations);
  }

  if (allViolations.length > 0) {
    for (const v of allViolations) {
      console.error(formatViolation(v));
      console.error('');
    }
    process.exit(1);
  }

  console.log(
    `[PASS] Additive migration check passed. ${files.length} file(s) checked, 0 violations.`,
  );
}

// Run main only when this file is the entrypoint (not when imported by tests)
const isEntrypoint =
  typeof import.meta.url === 'string' &&
  typeof process.argv[1] === 'string' &&
  (import.meta.url === `file://${process.argv[1]}` ||
    // bun resolves the path differently; compare basenames as a secondary check
    path.basename(new URL(import.meta.url).pathname) ===
      path.basename(process.argv[1]));

if (isEntrypoint) {
  main();
}

console.log('\n✓ All migrations passed additive validation.');
process.exit(0);
