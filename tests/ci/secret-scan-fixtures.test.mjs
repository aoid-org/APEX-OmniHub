import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const scanner = path.join(repoRoot, 'scripts', 'secret-scan.mjs');
const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'apex-secret-scan-'));
mkdirSync(path.join(fixtureRoot, 'scripts'), { recursive: true });
mkdirSync(path.join(fixtureRoot, 'safe'), { recursive: true });
copyFileSync(scanner, path.join(fixtureRoot, 'scripts', 'secret-scan.mjs'));

// Synthetic fake scanner fixture only: deterministic JWT with role=service_role and inert signature.
const fakeServiceRoleJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoiZmFrZS1zY2FubmVyLWZpeHR1cmUifQ.fakeSyntheticSignature';
writeFileSync(path.join(fixtureRoot, 'unsafe.ts'), `const serviceRoleKey = "${fakeServiceRoleJwt}";\nconst password = "literal-password-fixture";\n`);
writeFileSync(path.join(fixtureRoot, 'safe', 'env-only.ts'), 'const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;\nconst password = Deno.env.get("LIVE_PROXY_PASSWORD");\n');

const unsafe = spawnSync(process.execPath, ['scripts/secret-scan.mjs'], { cwd: fixtureRoot, encoding: 'utf8' });
assert.notEqual(unsafe.status, 0, 'synthetic service-role fixture must fail');
assert.match(unsafe.stderr, /service_role JWT literal|serviceRoleKey assignment/);

writeFileSync(path.join(fixtureRoot, 'unsafe.ts'), 'const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;\n');
const safe = spawnSync(process.execPath, ['scripts/secret-scan.mjs'], { cwd: fixtureRoot, encoding: 'utf8' });
assert.equal(safe.status, 0, safe.stderr);

console.log('secret-scan fixture tests passed');
