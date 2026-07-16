// Gate 29 — Edge Function Existence Check (PRCC-001 §6)
// Every edge function referenced by the frontend must exist:
//   Tier 1 (always): as a directory under supabase/functions/
//   Tier 2 (when SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF are set):
//     in the project's DEPLOYED function list via the Management API.
// Prevents the silent-404 class found 2026-07-01 (generate-business-skills,
// activate-client, create-checkout, identity-webauthn).
//
// Enforcement: fails the build on any gap. Set GATE29_WARN_ONLY=1 to downgrade
// to warnings during the initial 48h bake-in window (PRCC-001 §7).
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const FRONTEND_DIRS = [
  "apps/omnihub-site/src",
  "apps/omnihub-site/dashboard",
];
const FN_DIR = path.join(ROOT, "supabase", "functions");
const WARN_ONLY = process.env.GATE29_WARN_ONLY === "1";
// Opt-in fail-closed switch: when set, an unavailable/BLOCKED Tier 2
// (deployed-list verification) is treated as a FAILURE instead of a soft pass.
// Default off preserves current behavior; enable in release CI alongside
// SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF to make deployment verification blocking.
const REQUIRE_TIER2 = process.env.GATE29_REQUIRE_TIER2 === "1";

function collectSourceFiles(dir) {
  const out = [];
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  const stack = [abs];
  while (stack.length) {
    const cur = stack.pop();
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const p = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) out.push(p);
    }
  }
  return out;
}

function extractReferences(files) {
  const refs = new Map(); // slug -> [file:line]
  const patterns = [
    /functions\/v1\/([a-z0-9][a-z0-9-]*)/g,
    /functions\.invoke\(\s*['"`]([a-z0-9][a-z0-9-]*)['"`]/g,
  ];
  for (const file of files) {
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const re of patterns) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(line)) !== null) {
          const slug = m[1];
          if (!refs.has(slug)) refs.set(slug, []);
          refs.get(slug).push(`${path.relative(ROOT, file)}:${i + 1}`);
        }
      }
    });
  }
  return refs;
}

function repoFunctionDirs() {
  return new Set(
    fs.readdirSync(FN_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name !== "_shared")
      .map((d) => d.name),
  );
}

async function deployedFunctionSlugs() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_REF;
  if (!token || !ref) return null; // Tier 2 unavailable — honest BLOCKED, not pass
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/functions`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Management API ${res.status}`);
  return new Set((await res.json()).map((f) => f.slug));
}

const files = FRONTEND_DIRS.flatMap(collectSourceFiles);
const refs = extractReferences(files);
const repoFns = repoFunctionDirs();

console.log(`[gate29] scanned ${files.length} frontend files; ${refs.size} referenced edge functions`);

let failures = 0;

for (const [slug, sites] of [...refs.entries()].sort()) {
  if (!repoFns.has(slug)) {
    failures++;
    console.log(`[gate29] MISSING-IN-REPO: "${slug}" referenced at ${sites[0]} (+${sites.length - 1} more) has no supabase/functions/${slug}/ directory`);
  }
}

let deployed = null;
try {
  deployed = await deployedFunctionSlugs();
} catch (err) {
  console.log(`[gate29] WARN: deployed-list check errored (${err.message}); treating as BLOCKED`);
}

if (deployed === null) {
  console.log("[gate29] BLOCKED: no SUPABASE_ACCESS_TOKEN/SUPABASE_PROJECT_REF — deployed-list tier not verified (repo-existence tier only). This is not a pass for Tier 2.");
  if (REQUIRE_TIER2) {
    failures++;
    console.log("[gate29] REQUIRE_TIER2=1: Tier 2 (deployed verification) is mandatory but unavailable — treating BLOCKED as FAIL. Provide SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF in CI.");
  }
} else {
  for (const [slug, sites] of [...refs.entries()].sort()) {
    if (!deployed.has(slug)) {
      failures++;
      console.log(`[gate29] NOT-DEPLOYED: "${slug}" referenced at ${sites[0]} (+${sites.length - 1} more) is absent from the deployed function list`);
    }
  }
}

if (failures > 0) {
  const verdict = WARN_ONLY ? "WARN-ONLY (GATE29_WARN_ONLY=1)" : "FAIL";
  console.log(`[gate29] ${failures} gap(s) found — ${verdict}`);
  if (!WARN_ONLY) process.exit(1);
} else {
  console.log("[gate29] PASS: every frontend-referenced edge function exists" + (deployed ? " and is deployed" : " in the repo"));
}
