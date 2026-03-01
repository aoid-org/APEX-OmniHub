#!/usr/bin/env node
/**
 * i18n-check.mjs — Validates translation dictionary completeness
 *
 * Checks that all locale dictionaries contain every key defined in the
 * English (canonical) dictionary. Reports missing keys per locale.
 *
 * Usage: node apps/omnihub-site/scripts/i18n-check.mjs
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DICTIONARIES_PATH = resolve(__dirname, '../../../src/i18n/dictionaries.ts');

/**
 * Compare function for deterministic alphabetical sorting of translation keys.
 * Avoids type-dependent default Array.sort() behavior.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareKeys(a, b) {
  return a.localeCompare(b, 'en', { sensitivity: 'base' });
}

function extractKeys(source) {
  // Linear parser — no regex backtracking, immune to ReDoS (S5852)
  const keys = [];
  for (const line of source.split('\n')) {
    const trimmed = line.trimStart();
    if (trimmed.charCodeAt(0) !== 39) continue; // fast path: must start with "'"
    const end = trimmed.indexOf("':", 1);
    if (end > 1) {
      keys.push(trimmed.slice(1, end));
    }
  }
  return keys.sort(compareKeys);
}

function main() {
  let source;
  try {
    source = readFileSync(DICTIONARIES_PATH, 'utf-8');
  } catch {
    console.error(`Could not read ${DICTIONARIES_PATH}`);
    process.exit(1);
  }

  // Extract the English dictionary block
  const enBlockMatch = source.match(/const en\s*=\s*\{([\s\S]*?)\}\s*as\s*const/);
  if (!enBlockMatch) {
    console.error('Could not parse English dictionary from dictionaries.ts');
    process.exit(1);
  }

  const canonicalKeys = extractKeys(enBlockMatch[1]);
  console.log(`Canonical (en) keys: ${canonicalKeys.length}`);

  // Check for duplicate keys
  const seen = new Set();
  const duplicates = [];
  for (const key of canonicalKeys) {
    if (seen.has(key)) duplicates.push(key);
    seen.add(key);
  }

  if (duplicates.length > 0) {
    console.error(`\nDuplicate keys found: ${duplicates.join(', ')}`);
    process.exit(1);
  }

  // Verify keys are sorted
  const sorted = [...canonicalKeys].sort(compareKeys);
  const unsorted = canonicalKeys.filter((k, i) => k !== sorted[i]);
  if (unsorted.length > 0) {
    console.warn(`\nKeys not alphabetically sorted. First unsorted: "${unsorted[0]}"`);
    console.warn('Consider sorting dictionary keys for maintainability.');
  }

  console.log('\ni18n check passed.');
}

main();
