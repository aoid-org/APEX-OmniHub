#!/usr/bin/env tsx
/**
 * audit-features.ts - Ghost feature detection script
 *
 * Compares routes in App.tsx against Feature Registry.
 * Reports:
 * - Ghost features: routes in App.tsx not in registry
 * - Orphan features: registry entries with no route in App.tsx
 *
 * Usage: npm run audit:features
 * Exit codes:
 *   0 = all features accounted for
 *   1 = ghost or orphan features found
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEATURE_REGISTRY } from '../src/features/registry';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_TSX_PATH = path.resolve(__dirname, '../src/App.tsx');

interface AuditResult {
  registryPaths: string[];
  appRoutes: string[];
  ghosts: string[];
  orphans: string[];
}

function extractRoutesFromApp(): string[] {
  const content = fs.readFileSync(APP_TSX_PATH, 'utf-8');

  // Match Route path="..." patterns
  const routeRegex = /path=["']([^"']+)["']/g;
  const routes: string[] = [];

  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const routePath = match[1];
    // Skip catch-all and dynamic routes for comparison
    if (!routePath.includes('*') && !routePath.includes(':')) {
      routes.push(routePath.startsWith('/') ? routePath : `/${routePath}`);
    }
  }

  return [...new Set(routes)];
}

function audit(): AuditResult {
  const registryPaths = FEATURE_REGISTRY
    .filter((f) => f.isEnabled)
    .map((f) => f.path);

  const appRoutes = extractRoutesFromApp();

  // Ghost features: in App.tsx but not in registry
  const ghosts = appRoutes.filter((route) => !registryPaths.includes(route));

  // Orphan features: in registry but not in App.tsx
  const orphans = registryPaths.filter((path) => !appRoutes.includes(path));

  return {
    registryPaths,
    appRoutes,
    ghosts,
    orphans,
  };
}

function main(): void {
  console.log('\n🔍 Feature Audit\n');
  console.log('================\n');

  const result = audit();

  console.log(`📚 Registry features: ${result.registryPaths.length}`);
  console.log(`🛣️  App routes: ${result.appRoutes.length}\n`);

  let hasIssues = false;

  if (result.ghosts.length > 0) {
    console.log('👻 GHOST FEATURES (in App.tsx but not in registry):');
    for (const ghost of result.ghosts) {
      console.log(`   ❌ ${ghost}`);
    }
    console.log('');
    hasIssues = true;
  } else {
    console.log('✅ No ghost features found\n');
  }

  if (result.orphans.length > 0) {
    console.log('🏚️  ORPHAN FEATURES (in registry but no route):');
    for (const orphan of result.orphans) {
      console.log(`   ⚠️  ${orphan}`);
    }
    console.log('');
    hasIssues = true;
  } else {
    console.log('✅ No orphan features found\n');
  }

  if (hasIssues) {
    console.log('❌ Audit FAILED - please reconcile features\n');
    process.exit(1);
  } else {
    console.log('✅ Audit PASSED - all features accounted for\n');
    process.exit(0);
  }
}

main();
