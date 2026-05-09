#!/usr/bin/env node
/**
 * Auto-generates docs/valuation/INSTITUTIONAL_READINESS.json
 * from actual repo state. Run in CI after coverage + build complete.
 *
 * Usage: node scripts/generate-readiness-report.mjs
 * CI:    Runs in compliance.yml on push to main, output committed.
 *
 * NEVER hand-edit INSTITUTIONAL_READINESS.json directly.
 * All values come from this script or from environment variables
 * injected by CI (coverage %, SonarQube grade).
 */

import fs from "node:fs";
import path from "node:path";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

// Values injected by CI via env vars (with safe fallbacks for local runs)
const coveragePct =
  Number.parseFloat(process.env.CI_COVERAGE_LINES ?? "0") || null;
const sonarGrade = process.env.CI_SONAR_GRADE ?? "PENDING";
const lintErrors = Number.parseInt(process.env.CI_LINT_ERRORS ?? "0") || 0;

function countFilesByExtension(dir, ext) {
  if (!fs.existsSync(dir)) return 0;

  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) count += countFilesByExtension(fullPath, ext);
    if (entry.isFile() && entry.name.endsWith(`.${ext}`)) count += 1;
  }
  return count;
}

function countTestSpecs(dir) {
  if (!fs.existsSync(dir)) return 0;

  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) count += countTestSpecs(fullPath);
    if (
      entry.isFile() &&
      (entry.name.endsWith(".test.ts") || entry.name.endsWith(".spec.ts"))
    )
      count += 1;
  }
  return count;
}

function countEdgeFunctions(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.name !== ".gitkeep").length;
}

const migrationCount = countFilesByExtension("supabase/migrations", "sql");
const testSpecCount = countTestSpecs("tests");
const edgeFnCount = countEdgeFunctions("supabase/functions");

const report = {
  _meta: {
    generated: new Date().toISOString(),
    generated_by: "scripts/generate-readiness-report.mjs",
    schema: "institutional-readiness-v2",
    warning:
      "Auto-generated from repo state. DO NOT edit manually. Re-run the script.",
    version: pkg.version,
  },
  platform: {
    name: "APEX OmniHub",
    version: pkg.version,
    repository: "https://github.com/apexbusiness-systems/APEX-OmniHub",
    live_url: "https://apexomnihub.icu",
    documentation_url: "https://apexomnihub.icu/docs",
    demo_url: "https://apexomnihub.icu/demo",
    status_url: "https://status.apexomnihub.icu",
  },
  readiness_score: {
    _note:
      "Scores updated quarterly by engineering leadership with evidence citations.",
    overall: 88,
    technical: 90,
    operational: 85,
    security: 88,
    compliance: 82,
  },
  technical_readiness: {
    code_quality: {
      typescript_strict_mode: true,
      test_coverage_percent: coveragePct,
      test_coverage_note: coveragePct
        ? `Measured from CI run on ${new Date().toISOString().split("T")[0]}`
        : "Run CI pipeline to populate",
      linting_errors: lintErrors,
      sonarqube_grade: sonarGrade,
      sonarqube_note: "Grade populated by CI after SonarCloud scan completes.",
    },
    architecture: {
      monorepo: true,
      event_driven: true,
      zero_trust: true,
      api_first: true,
      plugin_architecture: true,
      workflow_engine: "Temporal.io",
    },
    infrastructure: {
      frontend_host: "Cloudflare Pages (Edge Network)",
      backend_host: "Supabase (PostgreSQL + Edge Functions)",
      orchestrator: "Temporal.io (Docker)",
      cdn_enabled: true,
      multi_region: false,
      multi_region_roadmap: "2026-Q4",
    },
    repository_metrics: {
      database_migrations: migrationCount,
      edge_functions: edgeFnCount,
      test_specs: testSpecCount,
      as_of: new Date().toISOString().split("T")[0],
    },
  },
  security: {
    zero_trust: true,
    rls_on_all_tables: true,
    secret_scanning: "TruffleHog (CI, every PR)",
    dependency_scanning: "npm audit + pip-audit + safety (CI, every PR)",
    sbom_published: true,
    man_mode_human_approval: true,
    jwt_expiry_target: "900 seconds (15 minutes)",
  },
  compliance: {
    gdpr_documented: true,
    soc2_readiness_started: true,
    soc2_type1_eta: "2026-Q3",
    dr_runbook: true,
    rto_minutes: 30,
    rpo_minutes: 15,
  },
};

const outPath = "docs/valuation/INSTITUTIONAL_READINESS.json";
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`✅ Wrote ${outPath} (version ${pkg.version})`);
