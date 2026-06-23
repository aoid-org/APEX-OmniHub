#!/usr/bin/env node
// APEX-OmniHub OmniSkills Rebrand Guard
// Prevents regression of user-facing "Skill Forge" or "SkillForge" copy
// into rendered product surfaces (headings, buttons, toast text, page titles,
// nav labels, i18n strings). Internal identifiers (component names, file names,
// route paths, code comments, test fixtures, memory docs) are ALLOWED.
//
// ALLOWED_INTERNAL_IDENTIFIER patterns — not scanned:
//   - Component/function names: export function SkillForge
//   - Import statements
//   - Route path strings: "/launch/skillforge"
//   - JSX comments: {/* Skill Forge ... */}
//   - Code comments: // ... or /** ... */
//   - Test and spec files
//   - memory/, docs/, CHANGELOG.md (historical)
//
// MUST_FIX_USER_FACING: rendered text nodes, string literals used as UI copy,
//   i18n JSON values, page <title>, toast descriptions, <h1>/<h2> headings.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { walkFiles } from "./ci-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const rel = (p) => path.relative(repoRoot, p).replaceAll("\\", "/");

const USER_FACING_ROOTS = [
  path.join(repoRoot, "apps", "omnihub-site", "src", "i18n"),
  path.join(repoRoot, "apps", "omnihub-site", "public"),
  path.join(repoRoot, "public"),
];

// Also scan specific rendered-copy files
const INDIVIDUAL_FILES = [
  path.join(repoRoot, "apps", "omnihub-site", "src", "content", "site.ts"),
  path.join(repoRoot, "apps", "omnihub-site", "src", "pages", "Launch", "SkillForge.tsx"),
  path.join(repoRoot, "apps", "omnihub-site", "src", "App.tsx"),
];

const SCAN_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".html", ".md"]);

const EXCLUDE = [
  /\.test\.|\.spec\.|__tests__/,
  /\/node_modules\//,
  /\/dist\//,
  /\/build\//,
  /\/coverage\//,
];

// Lines that are ALLOWED to contain SkillForge — internal code structures
const ALLOWED_LINE_PATTERNS = [
  /^\s*\/\//, // line comment
  /^\s*\*/, // JSDoc body
  /^\s*\{\/\*/, // JSX block comment open
  /^\s*import\s/, // import statement
  /export\s+(function|class|const)\s+SkillForge\b/, // component export
  /(["'])\/launch\/skillforge\1/, // route path slug
  /createProtectedElement\(<SkillForge\s*\/>/, // component usage in route
  /path\.join|path\.resolve|require\(|from\s+['"]/, // path/module refs
];

// Patterns indicating user-facing rendered copy containing legacy brand
// Exclude "SKILL FORGED" (past-tense verb phrase) — not a product name occurrence
const LEGACY_BRAND_IN_RENDERED_RE = /Skill\s+Forge(?!d\b)/i;

function isAllowedLine(line) {
  return ALLOWED_LINE_PATTERNS.some((re) => re.test(line));
}

// walk() extracted to ci-utils.mjs as walkFiles()

const files = [
  ...new Set([
    ...USER_FACING_ROOTS.flatMap((r) => walkFiles(r, SCAN_EXTS, EXCLUDE, [])),
    ...INDIVIDUAL_FILES.filter((f) => fs.existsSync(f)),
  ]),
];

const findings = [];

for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (isAllowedLine(line)) return;
    if (LEGACY_BRAND_IN_RENDERED_RE.test(line)) {
      findings.push({ location: `${rel(file)}:${i + 1}`, text: line.trim().slice(0, 120) });
    }
  });
}

console.log("=== check:omniskills-rebrand — OmniSkills Brand Guard ===");
console.log(`Scanned ${files.length} user-facing file(s) for legacy "Skill Forge" rendered copy.`);

if (findings.length > 0) {
  console.error(`\n❌ check:omniskills-rebrand FAILED — ${findings.length} legacy user-facing reference(s):`);
  for (const f of findings) {
    console.error(`  ${f.location}\n      ${f.text}`);
  }
  console.error(
    "\nUpdate rendered copy to use 'OmniSkills'. Internal identifiers (component names,\n" +
    "route paths, code comments, test files, memory docs) do not need to change."
  );
  process.exit(1);
}

console.log("check:omniskills-rebrand PASSED — no legacy 'Skill Forge' in rendered copy.");
process.exit(0);
