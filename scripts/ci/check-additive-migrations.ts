import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

const scriptDir = new URL('.', import.meta.url).pathname;
const migrationsDir = path.join(scriptDir, '../../supabase/migrations');

// Full path avoids PATH lookup (satisfies typescript:S4036)
const GIT_CMD = '/usr/bin/git';

// Reject rules for destructive operations
// Note: Regex patterns intentionally match dangerous SQL operations for detection.
// This is a security scanner that must analyze untrusted SQL input.
// NOSONAR - Patterns are designed to safely detect threats, not execute them
const REJECT_RULES = {
  DROP_TABLE: { pattern: /\bDROP\s+TABLE\b/i, id: 'DROP_TABLE', msg: 'DROP TABLE is not allowed' },
  DROP_COLUMN: { pattern: /\bALTER\s+TABLE\s+\w+\s+DROP\s+COLUMN\b/i, id: 'DROP_COLUMN', msg: 'ALTER TABLE ... DROP COLUMN is not allowed' },
  DROP_TYPE: { pattern: /\bDROP\s+TYPE\b/i, id: 'DROP_TYPE', msg: 'DROP TYPE is not allowed' },
  DROP_POLICY: { pattern: /\bDROP\s+POLICY\b/i, id: 'DROP_POLICY', msg: 'DROP POLICY is not allowed' },
  DROP_TRIGGER: { pattern: /\bDROP\s+TRIGGER\b/i, id: 'DROP_TRIGGER', msg: 'DROP TRIGGER is not allowed' },
  DROP_VALUE: { pattern: /\bALTER\s+TYPE\s+\w+\s+DROP\s+VALUE\b/i, id: 'DROP_VALUE', msg: 'ALTER TYPE ... DROP VALUE is not allowed' },
  DELETE_FROM: { pattern: /\bDELETE\s+FROM\b/i, id: 'DELETE_FROM', msg: 'DELETE FROM is not allowed' },
  TRUNCATE: { pattern: /\bTRUNCATE\b/i, id: 'TRUNCATE', msg: 'TRUNCATE is not allowed' },
  DISABLE_RLS: { pattern: /\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i, id: 'DISABLE_RLS', msg: 'DISABLE ROW LEVEL SECURITY is not allowed' },
  REVOKE: { pattern: /\bREVOKE\b/i, id: 'REVOKE', msg: 'REVOKE is not allowed' },
  ALTER_TYPE_CHANGE: { pattern: /\bALTER\s+TABLE\s+\w+\s+ALTER\s+COLUMN\s+\w+\s+TYPE\b/i, id: 'ALTER_TYPE', msg: 'ALTER COLUMN TYPE is not allowed' },
  ON_DELETE_CASCADE: { pattern: /\bON\s+DELETE\s+CASCADE\b/i, id: 'ON_DELETE_CASCADE', msg: 'ON DELETE CASCADE is not allowed' }
};

function getChangedMigrations(): string[] {
  try {
    if (process.env.GITHUB_BASE_REF) {
      // NOSONAR - GITHUB_BASE_REF is controlled by GitHub Actions, not user input
      const baseRef = `origin/${process.env.GITHUB_BASE_REF}`;
      const result = spawnSync(GIT_CMD, ['diff', '--name-only', `${baseRef}...HEAD`, '--', 'supabase/migrations/'], {
        encoding: 'utf8'
      });
      if (result.error) throw result.error;
      return result.stdout.split('\n').filter(f => f.endsWith('.sql')).map(f => path.basename(f));
    } else if (process.env.GITHUB_EVENT_NAME === 'push') {
      const result = spawnSync(GIT_CMD, ['diff', '--name-only', 'HEAD~1..HEAD', '--', 'supabase/migrations/'], {
        encoding: 'utf8'
      });
      if (result.error) throw result.error;
      return result.stdout.split('\n').filter(f => f.endsWith('.sql')).map(f => path.basename(f));
    }
  } catch {
    // Fallback: scan all migration files if git diff fails
  }
  // Fallback: scan all files
  return fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
}

function checkAllowlist(line: string): boolean {
  // NOSONAR - Pattern safely matches allowlist comments; no ReDoS risk
  const allowlistPattern = /--\s*additive-allow:\s*(\w+)\s+(.{12,})/;
  return allowlistPattern.test(line);
}

function validateFile(filePath: string, fileName: string): { failed: boolean; errors: Array<{ line: number; rule: string; msg: string; remediation: string }> } {
  if (!fs.existsSync(filePath)) {
    return { failed: true, errors: [{ line: 0, rule: 'NOT_FOUND', msg: `File not found: ${fileName}`, remediation: 'Verify file exists' }] };
  }

  // NOSONAR - Migration files are sourced from repo migrations directory, not user input
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const errors: Array<{ line: number; rule: string; msg: string; remediation: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check if line has allowlist comment
    if (checkAllowlist(line)) {
      continue; // Skip this line
    }

    // Check each rule
    for (const rule of Object.values(REJECT_RULES)) {
      if (rule.pattern.test(line)) {
        // NOSONAR - This is the intended purpose: detect and report destructive SQL operations
        errors.push({
          line: lineNum,
          rule: rule.id,
          msg: rule.msg,
          remediation: `Line ${lineNum}: ${line.trim()} — Use '-- additive-allow: ${rule.id} <reason 12+ chars>' to override`
        });
      }
    }
  }

  return { failed: errors.length > 0, errors };
}

// Main execution
const migrationsToCheck = getChangedMigrations();
console.log(`Scanning ${migrationsToCheck.length} migration file(s) for destructive operations...`);

let allFailed = false;

for (const migration of migrationsToCheck) {
  const filePath = path.join(migrationsDir, migration);
  const { failed, errors } = validateFile(filePath, migration);

  if (failed) {
    console.error(`\n[FATAL] ${migration}: ${errors.length} destructive operation(s) detected`);
    for (const err of errors) {
      console.error(`  ${err.rule} @ L${err.line}: ${err.msg}`);
      console.error(`    Remediation: ${err.remediation}`);
    }
    allFailed = true;
  } else {
    console.log(`[PASS] ${migration}`);
  }
}

if (allFailed) {
  console.error('\nMigrations must be strictly additive to support shadow-staged atomic flips.');
  process.exit(1);
}

console.log('\n✓ All migrations passed additive validation.');
process.exit(0);
