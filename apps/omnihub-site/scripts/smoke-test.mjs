#!/usr/bin/env node
/**
 * Smoke Test for APEX OmniHub Marketing Site
 * Verifies that each page contains expected content after build.
 *
 * Usage: node scripts/smoke-test.mjs
 *
 * Prerequisites: npm run build
 *
 * Note: Since this is a React app, content is in JS bundles, not HTML.
 * We check that HTML files exist and reference JS, then check JS for content.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = resolve(__dirname, '../dist');
const ASSETS_JS_DIR = resolve(DIST_DIR, 'assets/js');

// Page expectations
const PAGE_CHECKS = [
  { file: 'index.html', name: 'Home (/)', htmlContains: ['id="root"', '<script'] },
  { file: 'demo.html', name: 'Demo (/demo)', htmlContains: ['id="root"', '<script'] },
  { file: 'tech-specs.html', name: 'Tech Specs (/tech-specs)', htmlContains: ['id="root"', '<script'] },
  { file: 'request-access.html', name: 'Request Access (/request-access)', htmlContains: ['id="root"', '<script'] },
  { file: 'login.html', name: 'Login (/login)', htmlContains: ['id="root"', '<script'] },
  { file: 'privacy.html', name: 'Privacy (/privacy)', htmlContains: ['id="root"', '<script'] },
  { file: 'terms.html', name: 'Terms (/terms)', htmlContains: ['id="root"', '<script'] },
];

// Content that must exist somewhere in the JS bundles or static HTML
const CONTENT_CHECKS = [
  { content: 'APEX OmniHub', description: 'Brand name' },
  { content: 'Universal', description: 'Hero value prop' },
  { content: 'Orchestrator', description: 'Hero positioning' },
  { content: 'Technical Specifications', description: 'Tech specs page title' },
  { content: 'Request Access', description: 'Request access page' },
  { content: 'Welcome Back', description: 'Login page title' },
  { content: 'Privacy', description: 'Privacy page' },
  { content: 'Terms', description: 'Terms page' },
];

/**
 * Generic test runner that validates checks and logs results
 * @param {Array} checks - Array of check objects
 * @param {Function} validator - Function that validates each check (returns {passed, passMessage, failMessage})
 * @returns {number} Exit code (0 = all passed, 1 = some failed)
 */
function runChecks(checks, validator) {
  let exitCode = 0;
  for (const check of checks) {
    const result = validator(check);
    if (result.passed) {
      console.log(`✅ PASS: ${result.passMessage}`);
    } else {
      console.error(`❌ FAIL: ${result.failMessage}`);
      exitCode = 1;
    }
  }
  return exitCode;
}

console.log('🔍 APEX OmniHub Marketing Site - Smoke Test\n');

// Check dist directory exists
if (!existsSync(DIST_DIR)) {
  console.error('❌ ERROR: dist/ directory not found. Run `npm run build` first.\n');
  process.exit(1);
}

// Check HTML files
console.log('📄 Checking HTML entry points...\n');
const htmlExitCode = runChecks(PAGE_CHECKS, (check) => {
  const filePath = resolve(DIST_DIR, check.file);

  if (!existsSync(filePath)) {
    return {
      passed: false,
      failMessage: `${check.name} - File not found: ${check.file}`,
    };
  }

  const content = readFileSync(filePath, 'utf-8');
  const missing = check.htmlContains.filter(s => !content.includes(s));

  return {
    passed: missing.length === 0,
    passMessage: check.name,
    failMessage: `${check.name} - Missing HTML structure`,
  };
});

// Check JS bundles for content
console.log('\n📦 Checking JS bundles for content...\n');

if (!existsSync(ASSETS_JS_DIR)) {
  console.error('❌ ERROR: assets/js directory not found');
  process.exit(1);
}

// Read all JS files once
const jsFiles = readdirSync(ASSETS_JS_DIR).filter(f => f.endsWith('.js'));
const allJsContent = jsFiles
  .map(f => readFileSync(join(ASSETS_JS_DIR, f), 'utf-8'))
  .join('');

const contentExitCode = runChecks(CONTENT_CHECKS, (check) => ({
  passed: allJsContent.includes(check.content),
  passMessage: `${check.description} ("${check.content}")`,
  failMessage: `${check.description} - Missing: "${check.content}"`,
}));

// Final summary
const exitCode = htmlExitCode | contentExitCode;
console.log('');
console.log(exitCode === 0 ? '✅ All smoke tests passed!\n' : '❌ Some smoke tests failed.\n');

process.exit(exitCode);
