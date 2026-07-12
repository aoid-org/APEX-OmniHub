// Edge Function manifest drift guard.
// Enforces that scripts/ci/edge-functions.manifest.json is the single source of
// truth for which Supabase Edge Functions exist: it must exactly match the
// directories under supabase/functions/ (excluding _shared). Fails on any drift.
//
// Usage: node scripts/ci/check-edge-fn-manifest.mjs
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "scripts", "ci", "edge-functions.manifest.json");
const FN_DIR = path.join(ROOT, "supabase", "functions");

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const declared = new Set(manifest.functions);

const actual = new Set(
  fs.readdirSync(FN_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_shared")
    .map((d) => d.name),
);

const onDiskNotDeclared = [...actual].filter((f) => !declared.has(f)).sort();
const declaredNotOnDisk = [...declared].filter((f) => !actual.has(f)).sort();

let fail = false;
if (onDiskNotDeclared.length) {
  console.error(`[edge-manifest] on disk but MISSING from manifest: ${onDiskNotDeclared.join(", ")}`);
  fail = true;
}
if (declaredNotOnDisk.length) {
  console.error(`[edge-manifest] in manifest but MISSING on disk: ${declaredNotOnDisk.join(", ")}`);
  fail = true;
}
if (manifest.count !== actual.size) {
  console.error(`[edge-manifest] manifest.count=${manifest.count} but ${actual.size} function dirs exist`);
  fail = true;
}

if (fail) {
  console.error("FIX: update scripts/ci/edge-functions.manifest.json to match supabase/functions/.");
  process.exit(1);
}
console.log(`[edge-manifest] PASS: ${actual.size} edge functions match the canonical manifest.`);
