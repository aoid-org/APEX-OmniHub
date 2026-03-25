/**
 * Windows Compatibility & Build Integrity Tests
 *
 * Validates the four fixes from PR #912:
 * 1. postinstall script — no bare `bash` call
 * 2. sim:clean — no `rm -rf` (uses cross-platform Node)
 * 3. MCP client API route stubs exist
 * 4. Auth redirect alignment (ProtectedRoute → /auth)
 * 5. Idempotent migration (IF NOT EXISTS guards)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

describe('Windows Compatibility Fixes', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'));

  describe('postinstall script', () => {
    it('does not invoke bare bash command', () => {
      const postinstall: string = pkg.scripts.postinstall;
      // The script must not start a subprocess via `bash ` directly —
      // Windows machines without Git Bash / WSL will fail `npm ci`.
      expect(postinstall).not.toMatch(/\bbash\s/);
    });

    it('uses node for cross-platform githook installation', () => {
      const postinstall: string = pkg.scripts.postinstall;
      // Must use a node wrapper that gracefully handles missing shell
      expect(postinstall).toContain('node');
      expect(postinstall).toContain('install-githooks');
    });

    it('silently catches hook-install failures', () => {
      const postinstall: string = pkg.scripts.postinstall;
      // Must not crash npm ci if githook installation fails
      expect(postinstall).toMatch(/catch/);
    });
  });

  describe('sim:clean script', () => {
    it('does not use rm -rf', () => {
      const simClean: string = pkg.scripts['sim:clean'];
      expect(simClean).not.toMatch(/\brm\s+-rf\b/);
    });

    it('uses cross-platform node fs operations', () => {
      const simClean: string = pkg.scripts['sim:clean'];
      expect(simClean).toContain('node');
      expect(simClean).toMatch(/rmSync|rmdirSync/);
    });

    it('targets the evidence directory', () => {
      const simClean: string = pkg.scripts['sim:clean'];
      expect(simClean).toContain('evidence');
    });
  });
});

describe('MCP Client API Route Stubs', () => {
  const mcpApiDir = join(ROOT, 'apps/omnihub-site/src/api/mcp');

  it('api/mcp directory exists', () => {
    expect(existsSync(mcpApiDir)).toBe(true);
  });

  it('registry route handler exists', () => {
    expect(existsSync(join(mcpApiDir, 'registry.ts'))).toBe(true);
  });

  it('invoke route handler exists', () => {
    expect(existsSync(join(mcpApiDir, 'invoke.ts'))).toBe(true);
  });

  it('barrel index re-exports both handlers', () => {
    const barrel = readFileSync(join(mcpApiDir, 'index.ts'), 'utf-8');
    expect(barrel).toContain('handleRegistryRequest');
    expect(barrel).toContain('handleInvokeRequest');
  });

  it('registry handler returns valid agent list', () => {
    const src = readFileSync(join(mcpApiDir, 'registry.ts'), 'utf-8');
    // Must include the four canonical dev-stub agents
    expect(src).toContain('claude-mcp');
    expect(src).toContain('gpt4-mcp');
    expect(src).toContain('gemini-mcp');
    expect(src).toContain('llama-mcp');
  });
});

describe('Auth Redirect Alignment', () => {
  const protectedRoutePath = join(
    ROOT,
    'apps/omnihub-site/src/components/ProtectedRoute.tsx'
  );

  it('ProtectedRoute exists', () => {
    expect(existsSync(protectedRoutePath)).toBe(true);
  });

  it('redirects unauthenticated users to /auth', () => {
    const src = readFileSync(protectedRoutePath, 'utf-8');
    expect(src).toContain('"/auth"');
  });

  it('does NOT redirect to /omniport?mode=login', () => {
    const src = readFileSync(protectedRoutePath, 'utf-8');
    expect(src).not.toContain('/omniport?mode=login');
  });

  it('redirect target matches a route defined in App.tsx', () => {
    const appSrc = readFileSync(
      join(ROOT, 'apps/omnihub-site/src/App.tsx'),
      'utf-8'
    );
    // The ProtectedRoute redirects to "/auth" — verify App.tsx has that route
    expect(appSrc).toMatch(/path:\s*["']\/auth["']/);
  });
});

describe('Idempotent Migration — man_tasks_rls', () => {
  const migrationPath = join(
    ROOT,
    'supabase/migrations/20260219000000_man_tasks_rls.sql'
  );

  it('migration file exists', () => {
    expect(existsSync(migrationPath)).toBe(true);
  });

  it('uses IF NOT EXISTS guards for all CREATE POLICY statements', () => {
    const sql = readFileSync(migrationPath, 'utf-8');

    // Count policy names defined
    const policyNames = ['service_role_full_access', 'operator_select', 'operator_update'];
    for (const name of policyNames) {
      expect(sql).toContain(name);
    }

    // Every CREATE POLICY must be wrapped in IF NOT EXISTS
    const createPolicyCount = (sql.match(/CREATE POLICY/g) || []).length;
    const ifNotExistsCount = (sql.match(/IF NOT EXISTS/gi) || []).length;
    expect(createPolicyCount).toBeGreaterThan(0);
    expect(ifNotExistsCount).toBeGreaterThanOrEqual(createPolicyCount);
  });

  it('does not use bare CREATE POLICY without guard', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    // Strip DO $$ blocks — no CREATE POLICY should exist outside them
    const outsideBlocks = sql.replace(/DO \$\$[\s\S]*?END \$\$/g, '');
    expect(outsideBlocks).not.toMatch(/CREATE POLICY/);
  });

  it('uses a declared constant instead of duplicating the table name literal', () => {
    const sql = readFileSync(migrationPath, 'utf-8');
    // SonarCloud: "Define a constant instead of duplicating this literal 3 times"
    // The pg_policies lookups must use a DECLARE'd constant, not a raw string
    expect(sql).toMatch(/DECLARE[\s\S]*?CONSTANT\s+text\s*:=\s*'man_tasks'/);
    // The tablename comparisons should reference the variable, not the literal
    const lookups = sql.match(/tablename\s*=\s*(\S+)/g) || [];
    for (const lookup of lookups) {
      expect(lookup).not.toContain("'man_tasks'");
    }
  });
});
