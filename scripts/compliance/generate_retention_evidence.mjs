import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const policyPath = resolve('docs/compliance/DATA_RETENTION_POLICY.md');
const outputPath = resolve('build-artifacts/retention-evidence.json');
const source = readFileSync(policyPath, 'utf8');

const patterns = {
  app_logs_days: /Application logs:\s*(\d+)\s*days/i,
  access_logs_days: /Access logs:\s*(\d+)\s*days/i,
  audit_logs_days: /Audit logs:\s*(\d+)\s*days/i,
  db_backups_days: /Database backups:\s*(\d+)\s*days/i,
};

const retention = {};

for (const [key, pattern] of Object.entries(patterns)) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Missing retention field in policy: ${key}`);
  }
  retention[key] = Number.parseInt(match[1], 10);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `${JSON.stringify({
    policy: 'docs/compliance/DATA_RETENTION_POLICY.md',
    generated_at: new Date().toISOString(),
    retention,
  }, null, 2)}\n`,
);

console.log(`✓ retention-evidence generated at ${outputPath}`);
