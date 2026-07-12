#!/usr/bin/env node
/**
 * check-lockfile-sync — regression guard for the 2026-07-07 release failures.
 *
 * Fails when root package.json dependency ranges drift from bun.lock
 * (cause of `bun install --frozen-lockfile` release breakage) or when the
 * npm lockfile tree is invalid per `npm ls --package-lock-only`
 * (cause of sbom-gate ELSPROBLEMS, e.g. unsatisfied peer ranges).
 *
 * No network access required. Exit 0 = in sync, exit 1 = drift.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const errors = [];

// Gate 1: package.json ⊆ bun.lock (root workspace), identical ranges.
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
// bun.lock is JSONC-ish (trailing commas); normalize before parsing.
const bunLock = JSON.parse(
  readFileSync(resolve(root, "bun.lock"), "utf8").replace(/,(\s*[}\]])/g, "$1"),
);
const ws = bunLock.workspaces?.[""] ?? {};
for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
  const want = pkg[section] ?? {};
  const have = ws[section] ?? {};
  for (const [dep, range] of Object.entries(want)) {
    if (!(dep in have)) {
      errors.push(`bun.lock missing ${section}.${dep} (${range}) — run: bun install --lockfile-only`);
    } else if (have[dep] !== range) {
      errors.push(`bun.lock range drift ${dep}: package.json=${range} bun.lock=${have[dep]} — run: bun install --lockfile-only`);
    }
  }
  for (const dep of Object.keys(have)) {
    if (!(dep in want)) {
      errors.push(`bun.lock stale entry ${section}.${dep} not in package.json — run: bun install --lockfile-only`);
    }
  }
}

// Gate 2: npm lockfile tree must be valid (sbom-gate parity).
try {
  execSync("npm ls --all --package-lock-only", { cwd: root, stdio: "pipe" });
} catch (err) {
  const detail = String(err.stderr ?? err.stdout ?? err.message)
    .split("\n")
    .filter((l) => /invalid|ELSPROBLEMS/i.test(l))
    .slice(0, 10)
    .join("\n");
  errors.push(`npm ls --package-lock-only failed (sbom-gate will fail):\n${detail}\n— run: npm install --package-lock-only --ignore-scripts, then fix any peer conflicts via root "overrides".`);
}

if (errors.length > 0) {
  console.error("[check-lockfile-sync] FAIL");
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}
console.log("[check-lockfile-sync] OK — package.json, bun.lock, and package-lock.json are in sync.");
