/**
 * audit:features script
 * 
 * CI-enforced check for NO GHOST FEATURES compliance.
 * Fails if:
 * - Any router route is not in registry
 * - Any registry route is missing from router
 * - Banned placeholder markers outside allowed contexts
 * - No-op click handlers detected
 * 
 * Run with: npm run audit:features
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { glob } from 'glob';

// ============================================================================
// CONFIG
// ============================================================================

const dirname = path.dirname(new URL(import.meta.url).pathname);
const SRC_DIR = path.resolve(dirname, '../src');
const REGISTRY_PATH = path.resolve(SRC_DIR, 'features/registry.ts');
const APP_PATH = path.resolve(SRC_DIR, 'App.tsx');

const BANNED_MARKERS = [
  /TODO(?!:)/i,
  /FIXME/i,
  /Coming Soon/i,
  /\bTBD\b/i,
  /not implemented/i,
];

const ALLOWED_CONTEXTS = [
  'LockedFeaturePanel',
  'AccessGate',
];

const NO_OP_PATTERNS = [
  /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/,
  /onClick=\{\s*function\s*\(\)\s*\{\s*\}\s*\}/,
  /onClick=\{\s*\(\)\s*=>\s*undefined\s*\}/,
  /onClick=\{\s*\(\)\s*=>\s*null\s*\}/,
];

// ============================================================================
// CHECKS
// ============================================================================

interface AuditResult {
  pass: boolean;
  errors: string[];
  warnings: string[];
}

function checkRegistryExists(errors: string[]): void {
  console.log('\n📋 Check 1: Registry exists');
  if (!fs.existsSync(REGISTRY_PATH)) {
    errors.push('CRITICAL: Feature registry not found at src/features/registry.ts');
    console.log('   ❌ Registry file not found');
  } else {
    console.log('   ✅ Registry file exists');
  }
}

function parseRegistryRoutes(errors: string[]): string[] {
  console.log('\n📋 Check 2: Parse registry routes');
  try {
    const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf-8');
    const routeMatches = registryContent.matchAll(/route:\s*['"]([^'"]+)['"]/g);
    const routes = Array.from(routeMatches).map((m) => m[1]);
    console.log(`   ✅ Found ${routes.length} routes in registry`);
    return routes;
  } catch (error) {
    errors.push(`Failed to parse registry: ${error}`);
    console.log('   ❌ Failed to parse registry');
    return [];
  }
}

function parseAppRoutes(errors: string[]): string[] {
  console.log('\n📋 Check 3: Parse router routes');
  try {
    const appContent = fs.readFileSync(APP_PATH, 'utf-8');
    const pathMatches = appContent.matchAll(/<Route\s+[^>]*path=["']([^"']+)["']/g);
    const routes = Array.from(pathMatches).map((m) => m[1]).filter((r) => r !== '*');
    console.log(`   ✅ Found ${routes.length} routes in App.tsx`);
    return routes;
  } catch (error) {
    errors.push(`Failed to parse App.tsx: ${error}`);
    console.log('   ❌ Failed to parse App.tsx');
    return [];
  }
}

function checkUnregisteredRoutes(
  appRoutes: string[],
  registryRoutes: string[],
  errors: string[]
): void {
  console.log('\n📋 Check 4: Router routes must be registered');
  const unregisteredRoutes = appRoutes.filter((r) => !registryRoutes.includes(r));
  
  if (unregisteredRoutes.length > 0) {
    unregisteredRoutes.forEach((route) => {
      errors.push(`UNREGISTERED ROUTE: ${route} exists in router but not in registry`);
    });
    console.log(`   ❌ ${unregisteredRoutes.length} unregistered routes found`);
    unregisteredRoutes.forEach((r) => console.log(`      - ${r}`));
  } else {
    console.log('   ✅ All router routes are registered');
  }
}

async function checkBannedMarkers(warnings: string[]): Promise<number> {
  console.log('\n📋 Check 5: Banned placeholder markers');
  const srcFiles = await glob('**/*.{tsx,ts}', {
    cwd: SRC_DIR,
    ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
  });

  let bannedCount = 0;
  for (const file of srcFiles) {
    if (ALLOWED_CONTEXTS.some((ctx) => file.includes(ctx))) {
      continue;
    }

    const filePath = path.join(SRC_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const pattern of BANNED_MARKERS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line)) {
          const isComment = line.trim().startsWith('//') || line.trim().startsWith('*');
          if (!isComment) {
            const matches = line.match(pattern);
            warnings.push(`BANNED MARKER in ${file}:${i + 1}: "${matches?.[0] ?? 'unknown'}"`);
            bannedCount++;
          }
        }
      }
    }
  }

  if (bannedCount > 0) {
    console.log(`   ⚠️ ${bannedCount} banned markers found (see warnings)`);
  } else {
    console.log('   ✅ No banned markers in code');
  }

  return bannedCount;
}

async function checkNoOpHandlers(errors: string[]): Promise<number> {
  console.log('\n📋 Check 6: No-op click handlers');
  const srcFiles = await glob('**/*.{tsx,ts}', {
    cwd: SRC_DIR,
    ignore: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
  });

  let noOpCount = 0;
  for (const file of srcFiles) {
    const filePath = path.join(SRC_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const pattern of NO_OP_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          errors.push(`NO-OP HANDLER in ${file}:${i + 1}: Empty onClick handler`);
          noOpCount++;
        }
      }
    }
  }

  if (noOpCount > 0) {
    console.log(`   ❌ ${noOpCount} no-op handlers found`);
  } else {
    console.log('   ✅ No no-op handlers detected');
  }

  return noOpCount;
}

async function auditFeatures(): Promise<AuditResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('🔍 APEX Feature Registry Audit\n');
  console.log('═'.repeat(60));

  checkRegistryExists(errors);
  const registryRoutes = parseRegistryRoutes(errors);
  const appRoutes = parseAppRoutes(errors);
  checkUnregisteredRoutes(appRoutes, registryRoutes, errors);
  await checkBannedMarkers(warnings);
  await checkNoOpHandlers(errors);

  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 AUDIT SUMMARY\n');

  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach((e) => console.log(`   - ${e}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    warnings.forEach((w) => console.log(`   - ${w}`));
  }

  const pass = errors.length === 0;
  
  if (pass) {
    console.log('\n✅ AUDIT PASSED - No ghost features detected\n');
  } else {
    console.log(`\n❌ AUDIT FAILED - ${errors.length} error(s) found\n`);
  }

  return { pass, errors, warnings };
}

// ============================================================================
// MAIN
// ============================================================================

const result = await auditFeatures();
process.exit(result.pass ? 0 : 1);
