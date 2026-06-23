// APEX-OmniHub OmniSkills Rebrand Guard — fixture tests
// Proves: (1) rendered "Skill Forge" copy FAILS; (2) internal identifiers PASS;
// (3) SKILL FORGED toast verb PASSES; (4) compatibility route path PASSES;
// (5) clean OmniSkills copy PASSES.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const guard   = path.join(repoRoot, 'scripts', 'ci', 'check-omniskills-rebrand.mjs');
const ciUtils = path.join(repoRoot, 'scripts', 'ci', 'ci-utils.mjs');

const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'apex-omniskills-rebrand-'));
const scriptsDir  = path.join(fixtureRoot, 'scripts', 'ci');
const srcDir      = path.join(fixtureRoot, 'apps', 'omnihub-site', 'src', 'content');
const launchDir   = path.join(fixtureRoot, 'apps', 'omnihub-site', 'src', 'pages', 'Launch');
const appDir      = path.join(fixtureRoot, 'apps', 'omnihub-site', 'src');

mkdirSync(scriptsDir, { recursive: true });
mkdirSync(srcDir,     { recursive: true });
mkdirSync(launchDir,  { recursive: true });

copyFileSync(guard,   path.join(scriptsDir, 'check-omniskills-rebrand.mjs'));
copyFileSync(ciUtils, path.join(scriptsDir, 'ci-utils.mjs'));

// Ensure INDIVIDUAL_FILES targets exist (guard reads them explicitly)
writeFileSync(path.join(appDir,    'App.tsx'),      '');
writeFileSync(path.join(launchDir, 'SkillForge.tsx'), '');
writeFileSync(path.join(srcDir,    'site.ts'),      '');

function run(cwd) {
  return spawnSync(process.execPath, [path.join('scripts', 'ci', 'check-omniskills-rebrand.mjs')], {
    cwd,
    encoding: 'utf8',
  });
}

// ── TEST 1: Rendered "Skill Forge" heading MUST FAIL ─────────────────────────
writeFileSync(
  path.join(launchDir, 'SkillForge.tsx'),
  `export function SkillForge() {\n  return <h1>Skill Forge</h1>;\n}\n`,
);
{
  const result = run(fixtureRoot);
  assert.notEqual(result.status, 0, 'Rendered "Skill Forge" heading must FAIL the guard');
  assert.match(result.stderr, /Skill\s+Forge/i, 'Error message must reference the legacy brand');
}

// ── TEST 2: Internal identifiers MUST PASS ───────────────────────────────────
writeFileSync(
  path.join(launchDir, 'SkillForge.tsx'),
  `// Skill Forge — protected launch route. Invokes generate-business-skills.\n` +
  `import { SkillForge } from "@/pages/Launch/SkillForge";\n` +
  `export function SkillForge() {\n  return <h1>OmniSkills</h1>;\n}\n`,
);
writeFileSync(
  path.join(appDir, 'App.tsx'),
  `import { SkillForge } from "@/pages/Launch/SkillForge";\n` +
  `<Route path="/launch/skillforge" element={createProtectedElement(<SkillForge />, false, "OmniSkills")} />\n`,
);
{
  const result = run(fixtureRoot);
  assert.equal(result.status, 0, `Internal identifiers must PASS. stderr: ${result.stderr}`);
}

// ── TEST 3: "SKILL FORGED" toast (past tense) MUST PASS ──────────────────────
writeFileSync(
  path.join(launchDir, 'SkillForge.tsx'),
  `export function SkillForge() {\n` +
  `  toast.success('SKILL FORGED', { description: 'Your skill is now active.' });\n` +
  `  return <h1>OmniSkills</h1>;\n` +
  `}\n`,
);
{
  const result = run(fixtureRoot);
  assert.equal(result.status, 0, `"SKILL FORGED" past-tense toast must PASS. stderr: ${result.stderr}`);
}

// ── TEST 4: Rebranded "OmniSkills" heading MUST PASS ─────────────────────────
writeFileSync(
  path.join(launchDir, 'SkillForge.tsx'),
  `export function SkillForge() {\n  return <h1>OmniSkills</h1>;\n}\n`,
);
{
  const result = run(fixtureRoot);
  assert.equal(result.status, 0, `OmniSkills heading must PASS. stderr: ${result.stderr}`);
}

// ── TEST 5: i18n locale value MUST FAIL if it contains "Skill Forge" ─────────
const i18nDir = path.join(fixtureRoot, 'apps', 'omnihub-site', 'src', 'i18n', 'locales');
mkdirSync(i18nDir, { recursive: true });
writeFileSync(path.join(i18nDir, 'en-US.json'), JSON.stringify({ nav_skills: "Skill Forge" }));
{
  const result = run(fixtureRoot);
  assert.notEqual(result.status, 0, 'i18n "Skill Forge" value must FAIL the guard');
}
// Clean up i18n file
writeFileSync(path.join(i18nDir, 'en-US.json'), JSON.stringify({ nav_skills: "OmniSkills" }));
{
  const result = run(fixtureRoot);
  assert.equal(result.status, 0, `Rebranded i18n must PASS. stderr: ${result.stderr}`);
}

console.log('omniskills-rebrand fixture tests PASSED — 6/6 assertions verified');
