#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = join(__dirname, '..');
const repoRoot = join(appRoot, '..', '..');

const checks = [
  {
    file: join(appRoot, 'src/components/Layout.tsx'),
    pattern: /from\s+["']@\/i18n\//,
    message: 'app-local i18n imports must be relative to avoid root @/* ambiguity',
  },
  {
    file: join(appRoot, 'src/pages/Home.tsx'),
    pattern: /from\s+["']@\/i18n\//,
    message: 'app-local i18n imports must be relative to avoid root @/* ambiguity',
  },
  {
    file: join(appRoot, 'src/i18n/index.ts'),
    pattern: /isProd\s*\?\s*["']{2}/,
    message: 'production missing-key behavior must not render blank strings',
  },
];

const localeDir = join(appRoot, 'src/i18n/locales');
for (const localeFile of readdirSync(localeDir).filter((file) => file.endsWith('.json'))) {
  checks.push({
    file: join(localeDir, localeFile),
    pattern: /(?:中文：|日本語:\s|Português:\s|⟦missing:|Missing translation:)/,
    message: 'locale resources must not contain fake prefixes or missing-key diagnostics',
  });
}

const uiRoots = [
  join(appRoot, 'src/components'),
  join(appRoot, 'src/pages'),
  join(appRoot, 'dashboard'),
];

const suspiciousVisibleText = />\s*[A-Z][A-Za-z][^<{}`]{12,}\s*</;
const hardcodedAllowlist = [
  /APEX|Omni|MAESTRO|MAN Mode|Tri-Force|Guardian|Planner|Executor/,
  /[A-Z0-9_]{3,}/,
  /©|&times;|→|✓/,
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry)) files.push(full);
  }
  return files;
}

const sampledFiles = walk(uiRoots[0]).concat(walk(uiRoots[1])).concat(walk(uiRoots[2]));
for (const file of sampledFiles) {
  const source = readFileSync(file, 'utf8');
  const match = source.match(suspiciousVisibleText);
  if (match && !hardcodedAllowlist.some((allowed) => allowed.test(match[0]))) {
    // Advisory-only for now: global migration is incremental, but keep signal visible in CI logs.
    console.warn(`i18n advisory: possible hardcoded UI text in ${relative(repoRoot, file)}: ${match[0].slice(0, 100)}`);
  }
}

const failures = [];
for (const check of checks) {
  const source = readFileSync(check.file, 'utf8');
  if (check.pattern.test(source)) {
    failures.push(`${relative(repoRoot, check.file)} — ${check.message}`);
  }
}

if (failures.length > 0) {
  console.error('i18n hardcoded UI check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('i18n hardcoded UI check passed.');
