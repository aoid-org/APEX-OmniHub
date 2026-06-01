#!/usr/bin/env node
// APEX-OmniHub Supabase Security Gate (Prompts 4, 6, 16).
// Real static analysis of supabase/migrations: every table created in an exposed schema
// must have Row Level Security enabled across the migration history. Also fails if the
// service-role key appears in any migration. Fail-closed; exceptions require an allowlist.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const rel = (p) => path.relative(repoRoot, p).replaceAll("\\", "/");

// Schemas that are NOT publicly exposed via PostgREST and therefore do not require RLS.
const UNEXPOSED_SCHEMAS = new Set(["auth", "storage", "vault", "extensions", "graphql", "realtime", "pgsodium", "_internal", "private", "cron", "net", "supabase_migrations"]);

// Tables intentionally exempt from RLS (documented). Use `schema.table`.
const RLS_ALLOWLIST = new Set([
  // none — add `schema.table` with a code-review note if a table is provably safe without RLS.
]);

if (!fs.existsSync(migrationsDir)) {
  console.error(`❌ verify:supabase-security FAILED — migrations dir not found: ${rel(migrationsDir)}`);
  process.exit(1);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

const created = new Map(); // schema.table -> first file that created it
const rlsEnabled = new Set(); // schema.table
const dropped = new Set(); // schema.table
const serviceKeyHits = [];
const memoryRpcFailures = [];

const qualify = (schema, table) => `${(schema ?? "public").toLowerCase()}.${table.toLowerCase()}`;

const tblIdent = String.raw`(?:"?([a-z0-9_]+)"?\.)?"?([a-z0-9_]+)"?`;
const createRe = new RegExp(String.raw`create\s+table\s+(?:if\s+not\s+exists\s+)?${tblIdent}`, "gi");
const rlsRe = new RegExp(String.raw`alter\s+table\s+(?:only\s+)?(?:if\s+exists\s+)?${tblIdent}\s+enable\s+row\s+level\s+security`, "gi");
const dropRe = new RegExp(String.raw`drop\s+table\s+(?:if\s+exists\s+)?${tblIdent}`, "gi");
const functionBodyRe = (name) => new RegExp(String.raw`create\s+or\s+replace\s+function\s+public\.${name}\s*\([\s\S]*?\$\$([\s\S]*?)\$\$\s*;`, "i");
// Supabase service-role JWTs embed this role claim; a literal in SQL is a leak.
const serviceKeyRe = /service_role.*ey[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/;

for (const file of files) {
  const text = fs.readFileSync(path.join(migrationsDir, file), "utf8");

  for (const m of text.matchAll(createRe)) {
    const key = qualify(m[1], m[2]);
    if (!created.has(key)) created.set(key, file);
  }
  for (const m of text.matchAll(rlsRe)) {
    rlsEnabled.add(qualify(m[1], m[2]));
  }
  for (const m of text.matchAll(dropRe)) {
    dropped.add(qualify(m[1], m[2]));
  }
  text.split(/\r?\n/).forEach((line, i) => {
    if (serviceKeyRe.test(line)) serviceKeyHits.push(`${rel(path.join(migrationsDir, file))}:${i + 1}`);
  });

  if (file === "20260303000000_create_memories_table.sql") {
    for (const name of ["export_user_memories", "purge_user_memories"]) {
      const body = text.match(functionBodyRe(name))?.[1] ?? "";
      if (!/SECURITY\s+DEFINER/i.test(text.match(new RegExp(String.raw`create\s+or\s+replace\s+function\s+public\.${name}[\s\S]*?AS\s+\$\$`, "i"))?.[0] ?? "")) {
        memoryRpcFailures.push(`${name} must be SECURITY DEFINER with explicit in-function authorization checks`);
      }
      if (!/public\.get_jwt_tenant_id\s*\(\s*\)/i.test(body) || !/auth\.uid\s*\(\s*\)/i.test(body)) {
        memoryRpcFailures.push(`${name} must compare requested tenant/user against JWT tenant and auth.uid()`);
      }
      if (!/COALESCE\s*\(\s*auth\.role\s*\(\s*\)\s*=\s*'service_role'\s*,\s*false\s*\)/i.test(body)) {
        memoryRpcFailures.push(`${name} must treat a missing role claim as non-service-role`);
      }
      if (!/RAISE\s+EXCEPTION\s+'Access denied:/i.test(body)) {
        memoryRpcFailures.push(`${name} must fail closed on tenant/user mismatch`);
      }
      if (!new RegExp(String.raw`REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.${name}\s*\(`, "i").test(text)) {
        memoryRpcFailures.push(`${name} must revoke default PUBLIC execute privileges`);
      }
    }
    if (!/CREATE\s+OR\s+REPLACE\s+VIEW\s+public\.memory_health_stats\s+WITH\s*\(\s*security_invoker\s*=\s*true\s*\)/i.test(text)) {
      memoryRpcFailures.push("memory_health_stats must be a security_invoker view so memories RLS applies");
    }
  }
}

const missingRls = [];
for (const [key, file] of created.entries()) {
  const [schema] = key.split(".");
  if (UNEXPOSED_SCHEMAS.has(schema)) continue;
  if (RLS_ALLOWLIST.has(key)) continue;
  if (dropped.has(key)) continue; // dropped later — no longer exposed
  if (!rlsEnabled.has(key)) {
    missingRls.push({ key, file });
  }
}

console.log("=== verify:supabase-security — Supabase RLS & Secret Gate ===");
console.log(`Scanned ${files.length} migration(s): ${created.size} table(s) created, ${rlsEnabled.size} RLS enablement(s).`);

const failures = [];
if (missingRls.length > 0) {
  failures.push(`${missingRls.length} exposed table(s) without RLS:`);
  for (const { key, file } of missingRls) failures.push(`    ${key} (created in ${rel(path.join(migrationsDir, file))})`);
}
if (serviceKeyHits.length > 0) {
  failures.push(`service-role key/JWT literal found in migrations:`);
  for (const loc of serviceKeyHits) failures.push(`    ${loc}`);
}
if (memoryRpcFailures.length > 0) {
  failures.push(`memory RPC/view authorization hardening regressions:`);
  for (const failure of memoryRpcFailures) failures.push(`    ${failure}`);
}

if (failures.length > 0) {
  console.error(`\n❌ verify:supabase-security FAILED:`);
  for (const f of failures) console.error(`  ${f}`);
  console.error("\nEnable RLS on each exposed table, or add `schema.table` to RLS_ALLOWLIST with a documented justification.");
  process.exit(1);
}

console.log(`✓ All ${created.size - dropped.size} live exposed tables have RLS; no service-role literals in migrations.`);
console.log("verify:supabase-security PASSED");
process.exit(0);
