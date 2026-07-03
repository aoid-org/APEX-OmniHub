import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const script = path.join(repoRoot, 'scripts', 'verify-changelog-paths.js');
const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'apex-changelog-paths-'));
mkdirSync(path.join(fixtureRoot, 'docs'), { recursive: true });
writeFileSync(path.join(fixtureRoot, 'docs', 'real-existing.md'), '# exists\n');

// Fixture changelog: one existing path, one genuinely missing path, and three
// deletion-record lines that intentionally name paths which no longer exist.
writeFileSync(path.join(fixtureRoot, 'CHANGELOG.md'), [
  '## [Unreleased]',
  '',
  '### Added',
  '',
  '- `docs/real-existing.md` — new doc.',
  '- `docs/genuinely-missing.md` — referenced as current but absent from disk.',
  '',
  '### Removed',
  '',
  '- `docs/old/DEAD_DOC.md` — permanently deleted 2026-05-20. Superseded by `docs/old/missing-successor.md`.',
  '- `docs/old/RETIRED_DOC.md` — removed 2026-05-21.',
  '- `docs/old/LEGACY_DOC.md` — deprecated and removed 2026-05-22.',
  '',
].join('\n'));

const run = spawnSync(process.execPath, [script, 'CHANGELOG.md'], {
  cwd: fixtureRoot,
  encoding: 'utf8',
});

assert.equal(run.status, 0, `script must stay non-blocking (exit 0). stderr: ${run.stderr}`);

const warnings = run.stderr;

// A path referenced as current and missing from disk must still be flagged.
assert.match(warnings, /docs\/genuinely-missing\.md/, 'genuinely missing path must be flagged');

// Paths named on deletion-record lines document intentional removals — never flag them.
assert.doesNotMatch(warnings, /DEAD_DOC/, 'permanently-deleted record must not be flagged');
assert.doesNotMatch(warnings, /missing-successor/, 'token on a deletion-record line must not be flagged');
assert.doesNotMatch(warnings, /RETIRED_DOC/, '"— removed" record must not be flagged');
assert.doesNotMatch(warnings, /LEGACY_DOC/, '"— deprecated and removed" record must not be flagged');

// An existing path must never be flagged.
assert.doesNotMatch(warnings, /real-existing/, 'existing path must not be flagged');

console.log('verify-changelog-paths fixture tests passed');
