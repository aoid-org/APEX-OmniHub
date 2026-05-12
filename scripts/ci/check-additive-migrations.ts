import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

const scriptDir = new URL('.', import.meta.url).pathname;
const migrationsDir = path.join(scriptDir, '../../supabase/migrations');

// Determine target migrations based on git status
let targetMigrations: string[] = [];

try {
  // If in PR, base ref is usually available via GITHUB_BASE_REF
  const baseRef = process.env.GITHUB_BASE_REF;

  if (baseRef) {
    // In PR
    const changedFiles = execSync(`git diff --name-only origin/${baseRef} HEAD`).toString().trim().split('\n');
    targetMigrations = changedFiles.filter(f => f.startsWith('supabase/migrations/') && f.endsWith('.sql')).map(f => path.basename(f));
  } else {
    // On push/main or local
    const hasPreviousCommit = execSync('git rev-parse HEAD^').toString().trim() !== '';
    if (hasPreviousCommit) {
        const changedFiles = execSync('git diff --name-only HEAD^ HEAD').toString().trim().split('\n');
        targetMigrations = changedFiles.filter(f => f.startsWith('supabase/migrations/') && f.endsWith('.sql')).map(f => path.basename(f));
    } else {
        throw new Error('No previous commit found');
    }
  }
} catch {

  // Fallback: scan all
  console.log('Falling back to scanning all migrations...');
  if (fs.existsSync(migrationsDir)) {
      targetMigrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  }
}

if (targetMigrations.length === 0) {
  console.log('[PASS] No migrations to check.');
  process.exit(0);
}

let failed = false;

for (const file of targetMigrations) {
  const filePath = path.join(migrationsDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Migration file not found: ${file}`);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // We look for:
  // - DROP
  // - DELETE FROM
  // - TRUNCATE
  // - ALTER TABLE ... DROP
  // - ALTER TABLE ... ALTER COLUMN ... TYPE
  // - ALTER TYPE ... DROP VALUE
  // - DROP POLICY
  // - DROP TRIGGER
  // - DISABLE ROW LEVEL SECURITY
  // - REVOKE
  // - ON DELETE CASCADE

  const rules: { id: string; regex: RegExp }[] = [
    { id: 'DROP_TABLE_VIEW', regex: /\bDROP\s+(TABLE|VIEW|INDEX|FUNCTION|PROCEDURE|MATERIALIZED\s+VIEW|TYPE|DOMAIN|ROLE|USER)\b/i },
    { id: 'DELETE_FROM', regex: /\bDELETE\s+FROM\b/i },
    { id: 'TRUNCATE', regex: /\bTRUNCATE\s+(TABLE)?\b/i },
    { id: 'ALTER_TABLE_DROP', regex: /\bALTER\s+TABLE\s+.*?\s+DROP\b/i },
    { id: 'ALTER_TABLE_TYPE', regex: /\bALTER\s+TABLE\s+.*?\s+ALTER\s+(COLUMN)?\s+.*?\s+TYPE\b/i },
    { id: 'ALTER_TYPE_DROP', regex: /\bALTER\s+TYPE\s+.*?\s+DROP\b/i },
    { id: 'DROP_POLICY', regex: /\bDROP\s+POLICY\b/i },
    { id: 'DROP_TRIGGER', regex: /\bDROP\s+TRIGGER\b/i },
    { id: 'DISABLE_RLS', regex: /\bDISABLE\s+ROW\s+LEVEL\s+SECURITY\b/i },
    { id: 'REVOKE', regex: /\bREVOKE\b/i },
    { id: 'ON_DELETE_CASCADE', regex: /\bON\s+DELETE\s+CASCADE\b/i },
  ];

  const lines = content.split('\n');
  const codeLines = lines.map(line => {
    const commentIdx = line.indexOf('--');
    return commentIdx === -1 ? line : line.substring(0, commentIdx);
  });

  // Check for allowlists
  // syntax: -- additive-allow: <RULE_ID> <clear reason>
  const allowlistMap = new Map<string, string>();
  lines.forEach(line => {
    const match = line.match(/--\s*additive-allow:\s*([A-Z0-9_]+)\s+(.+)/);
    if (match) {
      allowlistMap.set(match[1], match[2]);
    }
  });

  let fileFailed = false;

  codeLines.forEach((line, index) => {
    for (const rule of rules) {
      if (rule.regex.test(line)) {
        if (allowlistMap.has(rule.id)) {
            // Alllowed
        } else {
            console.error(`\n[FATAL] Destructive operation detected in ${file}!`);
            console.error(`Rule: ${rule.id} (Migrations must be strictly additive)`);
            console.error(`Line ${index + 1}: ${lines[index].trim()}`);
            console.error(`Remediation: Remove this operation or explicitly allowlist it using '-- additive-allow: ${rule.id} <reason>'`);
            fileFailed = true;
            failed = true;
        }
      }
    }
  });

  if (!fileFailed) {
    console.log(`[PASS] Additive validation passed for ${file}.`);
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('[PASS] All additive validation passed.');
  process.exit(0);
}
