#!/usr/bin/env node
/**
 * Regression guard: unique Supabase migration version prefixes.
 *
 * Supabase applies migrations in lexical order keyed by the leading numeric
 * version (the `<version>_name.sql` prefix). Two files sharing a version
 * collide: the second is skipped or the apply is non-deterministic, which is
 * exactly the defect that shipped duplicate `20260621000000_*` migrations.
 *
 * This guard fails CI when any two migration files share a version prefix.
 * Pure Node, no dependencies. Exit 0 = unique, 1 = collision (or no dir).
 */
import { readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase", "migrations");

const VERSION_RE = /^(\d{6,})_.+\.sql$/;

// These versions are already recorded in the production migration history.
// Their filenames are an immutable repository-to-production identity contract:
// changing only the timestamp makes `supabase db push` fail before deployment.
const REQUIRED_APPLIED_MIGRATIONS = [
  "20260714133607_security_definer_invoker_hardening.sql",
  "20260716005122_private_authorization_helpers.sql",
];

function main() {
  let entries;
  try {
    entries = readdirSync(MIGRATIONS_DIR);
  } catch {
    console.error(`ERROR: migrations directory not found: ${MIGRATIONS_DIR}`);
    return 1;
  }

  /** @type {Map<string, string[]>} version -> filenames */
  const byVersion = new Map();
  for (const name of entries) {
    const full = join(MIGRATIONS_DIR, name);
    if (!statSync(full).isFile()) continue;
    const m = name.match(VERSION_RE);
    if (!m) continue; // ignore README/rollback dirs and non-conforming files
    const version = m[1];
    const list = byVersion.get(version) ?? [];
    list.push(name);
    byVersion.set(version, list);
  }

  if (byVersion.size === 0) {
    console.error("ERROR: no Supabase migration files matched <version>_name.sql");
    return 1;
  }

  const missingApplied = REQUIRED_APPLIED_MIGRATIONS.filter(
    (name) => !entries.includes(name),
  );
  if (missingApplied.length > 0) {
    console.error("Supabase applied migration identity guard FAILED:\n");
    for (const name of missingApplied) {
      console.error(`  [MISSING APPLIED MIGRATION] supabase/migrations/${name}`);
    }
    console.error(
      "\nDo not repair these production versions as reverted. Restore the exact " +
        "filename recorded in remote migration history.",
    );
    return 1;
  }

  const collisions = [...byVersion.entries()]
    .filter(([, files]) => files.length > 1)
    .sort(([a], [b]) => a.localeCompare(b));

  if (collisions.length > 0) {
    console.error("Supabase migration version guard FAILED:\n");
    for (const [version, files] of collisions) {
      console.error(`  [DUPLICATE ${version}]`);
      for (const f of files.sort()) console.error(`    - supabase/migrations/${f}`);
    }
    console.error(
      "\nRemediate: give each migration a unique version prefix (bump the trailing " +
        "digits) or remove the redundant file.",
    );
    return 1;
  }

  console.log(
    `Supabase migration version guard PASSED (${byVersion.size} unique versions).`,
  );
  return 0;
}

process.exit(main());
