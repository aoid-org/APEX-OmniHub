#!/usr/bin/env node
/**
 * APEX i18n Key Parity Enforcement
 * Verifies every locale JSON has exactly the same key set as en-US.
 * Exit 0 = all match. Exit 1 = mismatch detected.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesDir = join(__dirname, '..', 'src', 'i18n', 'locales');

/** Recursively extract all dot-notation keys from a nested object */
function extractKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

const files = readdirSync(localesDir).filter((f) => f.endsWith('.json'));
if (files.length === 0) {
  console.error('❌ No locale files found in', localesDir);
  process.exit(1);
}

const canonical = JSON.parse(readFileSync(join(localesDir, 'en-US.json'), 'utf-8'));
const canonicalKeys = extractKeys(canonical);

console.log(`📋 Canonical keys (en-US): ${canonicalKeys.length}`);
console.log(`   ${canonicalKeys.join(', ')}\n`);

let failures = 0;

for (const file of files) {
  if (file === 'en-US.json') continue;

  const locale = JSON.parse(readFileSync(join(localesDir, file), 'utf-8'));
  const localeKeys = extractKeys(locale);

  const missing = canonicalKeys.filter((k) => !localeKeys.includes(k));
  const extra = localeKeys.filter((k) => !canonicalKeys.includes(k));

  if (missing.length > 0 || extra.length > 0) {
    console.error(`❌ ${file}:`);
    if (missing.length > 0) console.error(`   Missing: ${missing.join(', ')}`);
    if (extra.length > 0) console.error(`   Extra:   ${extra.join(', ')}`);
    failures++;
  } else {
    console.log(`✅ ${file}: ${localeKeys.length} keys — matches en-US`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`🔴 ${failures} locale(s) have key mismatches. Fix before shipping.`);
  process.exit(1);
} else {
  console.log('🟢 All locales have identical key sets. Key parity verified.');
  process.exit(0);
}
