#!/usr/bin/env node
/**
 * APEX OmniSkin Engine (OSE v1.0) — OSE Guard (Layer 3)
 * Enforces the OmniSkin token contract so the invalid CSS var()+hex-alpha
 * regression (e.g. `${T.orange}22`, which silently drops the declaration)
 * and the re-injected-<style>-tag pattern cannot return to apps/omnihub-site/dashboard/.
 * Run: node scripts/ci/check-omni-skin.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DASHBOARD_DIR = resolve(ROOT, 'apps/omnihub-site/dashboard');
const SHELL = resolve(DASHBOARD_DIR, 'OmniDashShell.tsx');
const OMNI_SKIN_CSS = resolve(DASHBOARD_DIR, 'omniSkin.css');
const GHOST_PATH = resolve(ROOT, 'src/components/dashboard');
const GHOST_ALLOWLIST = new Set(['OmniTracePanel.tsx']);

// Invalid CSS: a var()-backed token reference (e.g. T.orange => var(--omni-orange))
// followed directly by hex digits, or string-concatenated with a hex literal.
// A fresh RegExp is built per call — reusing one /g-flagged instance across
// multiple .test() calls carries lastIndex state between files and silently
// produces false negatives on alternating calls.
function hasInvalidVarHex(src) {
  return /T\.\w+\}[0-9a-fA-F]{2}(?!\w)|T\.\w+\s*\+\s*["'][0-9a-fA-F]{2}["']/.test(src);
}

function listTsxFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { recursive: true })) {
    const full = join(dir, entry);
    if (!statSync(full).isFile()) continue;
    if (extname(full) === '.tsx') out.push(full);
  }
  return out;
}

let passed = 0, failed = 0;
function check(label, ok, fix = '') {
  if (ok) { console.log(`  PASS ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${fix ? ` - ${fix}` : ''}`); failed++; }
}

console.log('\n[APEX OmniSkin Engine — OSE Guard]\n');

const dashboardTsxFiles = existsSync(DASHBOARD_DIR) ? listTsxFiles(DASHBOARD_DIR) : [];

// Rule 1 — no <style> tags in dashboard TSX (keyframes/resets belong in omniSkin.css)
const styleTagOffenders = dashboardTsxFiles.filter((f) => /<style[\s>]/.test(readFileSync(f, 'utf8')));
check('no <style> tags in dashboard TSX', styleTagOffenders.length === 0,
  `found in: ${styleTagOffenders.map((f) => path.relative(ROOT, f)).join(', ')}`);

// Rule 2 — no invalid var()+hex-alpha pattern in dashboard module/component files
const moduleOffenders = dashboardTsxFiles
  .filter((f) => f !== SHELL)
  .filter((f) => hasInvalidVarHex(readFileSync(f, 'utf8')));
check('no invalid var()+hex-alpha pattern in dashboard module files', moduleOffenders.length === 0,
  `found in: ${moduleOffenders.map((f) => path.relative(ROOT, f)).join(', ')}`);

// Rule 3 — no var(--od-*) references in the files this contract owns (Shell +
// token forge). The dashboard-wide `--od-*` legacy token system is a separate,
// larger migration (alias layer, not deletion) tracked outside this contract's
// surgical scope — this guard only stops the Shell/token files from
// regressing back onto the retired pattern, not a repo-wide ban.
const OSE_OWNED_FILES = [SHELL, resolve(DASHBOARD_DIR, 'omniSkinTokens.ts'), resolve(DASHBOARD_DIR, 'designSystem.ts'), resolve(DASHBOARD_DIR, 'designSystem.tsx')]
  .filter((f) => existsSync(f));
const odTokenOffenders = OSE_OWNED_FILES.filter((f) => /var\(--od-/.test(readFileSync(f, 'utf8')));
check('no var(--od-*) references in Shell/token-forge files', odTokenOffenders.length === 0,
  `found in: ${odTokenOffenders.map((f) => path.relative(ROOT, f)).join(', ')}`);

// Rule 4 — no invalid var()+hex-alpha pattern in the Shell itself
if (existsSync(SHELL)) {
  const shellSrc = readFileSync(SHELL, 'utf8');
  check('no invalid var()+hex-alpha pattern in OmniDashShell.tsx', !hasInvalidVarHex(shellSrc),
    'convert `${T.x}hex` / `T.x+"hex"` to rgba()');
} else {
  check('OmniDashShell.tsx exists', false, 'shell file missing');
}

// Rule 5 — static OSE token-hygiene asset exists; runtime layout-token loading is
// owned by check:omnidash (it proves root src/main.tsx imports omnidash-layout.css).
// Do not require omniSkin.css in apps/omnihub-site/src/main.tsx: that entry is
// historical/app-local and is not the production root mounted by index.html.
check('omniSkin.css static token-hygiene asset exists (runtime layout proof is check:omnidash)', existsSync(OMNI_SKIN_CSS),
  'apps/omnihub-site/dashboard/omniSkin.css missing');

// Rule 6 — ghost path src/components/dashboard/ holds only the allowlisted file
if (existsSync(GHOST_PATH)) {
  const ghostFiles = readdirSync(GHOST_PATH).filter((f) => statSync(join(GHOST_PATH, f)).isFile());
  const unexpected = ghostFiles.filter((f) => !GHOST_ALLOWLIST.has(f));
  check('src/components/dashboard/ (ghost path) has no unexpected files', unexpected.length === 0,
    `unexpected: ${unexpected.join(', ')}`);
} else {
  check('src/components/dashboard/ (ghost path) has no unexpected files', true);
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) { console.error('[OSE Guard] CONTRACT VIOLATION\n'); process.exit(1); }
console.log('[OSE Guard] All invariants satisfied.\n');
