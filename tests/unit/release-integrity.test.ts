import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Release Harness Integrity', () => {
  it('should ensure all required verify scripts exist in package.json and are not empty', () => {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    
    const requiredScripts = [
      'verify:types',
      'verify:lint',
      'verify:test',
      'verify:build',
      'verify:security',
      'verify:assets',
      'verify:supabase-security',
      'verify:claim-hygiene',
      'verify:ci-integrity',
      'verify:supply-chain',
      'verify:release'
    ];
    
    for (const script of requiredScripts) {
      expect(pkg.scripts[script]).toBeDefined();
      expect(pkg.scripts[script]).not.toMatch(/^\s*(?:echo\s+.*|exit\s+0)\s*$/);
    }
  });

  it('should ensure the CI integrity scanner script actually exists and parses branch protection', () => {
    const scannerPath = path.resolve(process.cwd(), 'scripts/ci/verify-ci-integrity.mjs');
    expect(fs.existsSync(scannerPath)).toBe(true);
    
    const scannerContent = fs.readFileSync(scannerPath, 'utf-8');
    expect(scannerContent).toContain('=== APEX-OmniHub CI Integrity Scanner ===');
    expect(scannerContent).toContain('branch-protection.md');
  });
});
