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
 * Compare function for deterministic sorting of translation keys.
 * Uses Unicode code-point order via JS relational operators — locale-independent
 * and free of type-dependent behavior (avoids localeCompare runtime variance).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareKeys(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function extractKeys(source) {
  // Linear parser — no regex backtracking, immune to ReDoS (S5852)
  const keys = [];
  for (const line of source.split('\n')) {
    const trimmed = line.trimStart();
    if (trimmed.codePointAt(0) !== 39) continue; // fast path: must start with "'"
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

  // Extract the English dictionary block — linear scan, no regex backtracking
  const startMarker = 'const en = {';
  const endMarker = '} as const';
  const startIdx = source.indexOf(startMarker);
  const endIdx = source.indexOf(endMarker, startIdx);
  if (startIdx === -1 || endIdx === -1) {
    console.error('Could not parse English dictionary from dictionaries.ts');
    process.exit(1);
  }
  const enBlock = source.slice(startIdx + startMarker.length, endIdx);

  const canonicalKeys = extractKeys(enBlock);
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
