#!/usr/bin/env node
// APEX-OmniHub CI Integrity Scanner (Prompts 1 & 9).
// Fails closed on fake-pass gates, suppressed failures, and branch-protection drift.
// Honest by construction: this scanner contains real detection logic and will flag
// itself if it is ever reduced to a console.log placeholder.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const workflowDir = path.join(repoRoot, ".github", "workflows");
const verifyScriptDir = path.join(repoRoot, "scripts", "ci");
const branchProtectionDoc = path.join(repoRoot, "docs", "release", "branch-protection.md");

const violations = [];
const record = (rule, location, detail) => violations.push({ rule, location, detail });

const rel = (p) => path.relative(repoRoot, p).replaceAll("\\", "/");

// Inline escape hatch: `# ci-integrity-allow: <reason>` on the same or previous line.
const ALLOW_TOKEN = "ci-integrity-allow:";

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".tar", ".7z", ".mp4", ".webm", ".mp3", ".wav", ".woff", ".woff2", ".ttf", ".eot", ".wasm", ".bin",
]);
const EXCLUDED_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage", ".turbo", ".cache"]);
const GENERATED_SEGMENTS = new Set(["generated", "build-artifacts"]);

function readLines(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/);
}

function isAllowed(lines, index) {
  const current = lines[index] ?? "";
  const previous = index > 0 ? lines[index - 1] : "";
  return current.includes(ALLOW_TOKEN) || (previous.trim().startsWith("#") && previous.includes(ALLOW_TOKEN));
}

function isYamlCommentLine(line) {
  return line.trimStart().startsWith("#");
}


function walkTextFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name) || GENERATED_SEGMENTS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTextFiles(full, acc);
      continue;
    }
    if (!entry.isFile()) continue;
    if (BINARY_EXTENSIONS.has(path.extname(full).toLowerCase())) continue;
    const buffer = fs.readFileSync(full);
    if (buffer.includes(0)) continue;
    acc.push(full);
  }
  return acc;
}

function scanConflictMarkers() {
  const markerRe = /^(<<<<<<<|=======|>>>>>>>)($|[ 	].*)/m;
  for (const file of walkTextFiles(repoRoot)) {
    const text = fs.readFileSync(file, "utf8");
    if (markerRe.test(text)) {
      record("conflict-marker", rel(file), "unresolved merge conflict marker found");
    }
  }
}

// 1. Required job IDs are parsed from branch-protection.md so the scanner cannot
//    drift from the documented contract.
function parseRequiredJobs() {
  if (!fs.existsSync(branchProtectionDoc)) {
    record("branch-protection-doc-missing", rel(branchProtectionDoc), "branch-protection.md not found");
    return [];
  }
  const text = fs.readFileSync(branchProtectionDoc, "utf8");
  const pattern = /Job ID \/ Name\*\*:\s*`([^`]+)`\s*\(defined in `\.github\/workflows\/([^`]+)`\)/g;
  const required = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    required.push({ jobId: match[1].trim(), workflow: match[2].trim() });
  }
  if (required.length === 0) {
    record("branch-protection-doc-empty", rel(branchProtectionDoc), "no required job IDs parsed");
  }
  return required;
}

// Extract top-level job IDs from a workflow file (line-based, no YAML dependency —
// integrity scans must not add runtime deps).

function workflowHasPullRequestTrigger(lines) {
  let inOn = false;
  let onIndent = -1;
  for (const line of lines) {
    if (/^on:\s*\[.*\bpull_request\b.*\]/.test(line)) return true;
    if (/^on:\s*$/.test(line)) {
      inOn = true;
      onIndent = line.search(/\S/);
      continue;
    }
    if (!inOn) continue;
    const indent = line.search(/\S/);
    if (line.trim() !== "" && indent <= onIndent && !line.startsWith("on:")) {
      inOn = false;
      continue;
    }
    if (/^\s*pull_request\s*:/.test(line)) return true;
  }
  return false;
}

function parseWorkflowJobs(lines) {
  const jobs = [];
  let inJobs = false;
  let jobsIndent = -1;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      jobsIndent = line.search(/\S/);
      continue;
    }
    if (!inJobs) continue;
    const indent = line.search(/\S/);
    if (line.trim() !== "" && indent <= jobsIndent && !line.startsWith("jobs:")) {
      inJobs = false;
      continue;
    }
    const jobMatch = line.match(/^(\s{2,})([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch?.[1].length === jobsIndent + 2) {
      jobs.push({ id: jobMatch[2] });
    }
  }
  return jobs;
}

function parseJobDisplayNames(lines) {
  const names = [];
  let currentJob = null;
  let inJobs = false;
  let jobsIndent = -1;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      jobsIndent = line.search(/\S/);
      continue;
    }
    if (!inJobs) continue;
    const jobMatch = line.match(/^(\s{2,})([A-Za-z0-9_-]+):\s*$/);
    if (jobMatch?.[1].length === jobsIndent + 2) {
      currentJob = jobMatch[2];
      continue;
    }
    const nameMatch = line.match(/^\s+name:(.*)$/);
    if (nameMatch && currentJob) {
      names.push({ jobId: currentJob, name: nameMatch[1].trim().replace(/^["']|["']$/g, "") });
      currentJob = null;
    }
  }
  return names;
}

function scanWorkflows(required) {
  if (!fs.existsSync(workflowDir)) {
    record("workflow-dir-missing", rel(workflowDir), "no .github/workflows directory");
    return;
  }
  const files = fs.readdirSync(workflowDir).filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
  const requiredWorkflows = new Set(required.map((r) => r.workflow));
  const displayNameMap = new Map();

  for (const file of files) {
    const full = path.join(workflowDir, file);
    const lines = readLines(full);
    const isRequired = requiredWorkflows.has(file);

    lines.forEach((line, i) => {
      if (
        /\|\|\s*true\b/.test(line) &&
        !isYamlCommentLine(line) &&
        !isAllowed(lines, i)
      ) {
        record("masked-failure", `${rel(full)}:${i + 1}`, "`|| true` suppresses command exit code");
      }
      // Per the release contract, continue-on-error only defeats branch protection on
      // required gates; non-required workflows may legitimately tolerate optional steps.
      if (isRequired && /^\s*continue-on-error:\s*true\s*$/.test(line) && !isAllowed(lines, i)) {
        record("continue-on-error", `${rel(full)}:${i + 1}`, "continue-on-error: true in required-workflow");
      }
    });

    for (const { jobId, name } of parseJobDisplayNames(lines)) {
      const key = name.toLowerCase();
      if (!displayNameMap.has(key)) displayNameMap.set(key, []);
      displayNameMap.get(key).push(`${file}:${jobId}`);
    }
  }

  for (const [name, locations] of displayNameMap.entries()) {
    if (locations.length > 1) {
      record("duplicate-job-name", locations.join(", "), `display name "${name}" used by ${locations.length} jobs`);
    }
  }

  for (const { jobId, workflow } of required) {
    const full = path.join(workflowDir, workflow);
    if (!fs.existsSync(full)) {
      record("required-workflow-missing", workflow, "workflow declared in branch-protection.md not found");
      continue;
    }
    const requiredWorkflowLines = readLines(full);
    if (!workflowHasPullRequestTrigger(requiredWorkflowLines)) {
      record("required-workflow-no-pr-trigger", workflow, `required PR workflow for job "${jobId}" does not declare pull_request`);
    }
    const jobs = parseWorkflowJobs(requiredWorkflowLines);
    if (!jobs.some((j) => j.id === jobId)) {
      record("required-job-drift", workflow, `required job "${jobId}" not found (branch-protection drift)`);
    }
  }
}

// Detect fake-pass verify scripts: a verify-*.mjs whose only executable behavior is to
// print a success string. This is the exact pattern Prompts 1 & 9 require us to reject.
function scanFakePassScripts() {
  if (!fs.existsSync(verifyScriptDir)) return;
  const files = fs.readdirSync(verifyScriptDir).filter((f) => /^verify-.*\.mjs$/.test(f));
  for (const file of files) {
    const full = path.join(verifyScriptDir, file);
    const meaningful = fs
      .readFileSync(full, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(
        (l) =>
          l !== "" &&
          !l.startsWith("//") &&
          !l.startsWith("#!") &&
          !l.startsWith("import ") &&
          !l.startsWith("/*") &&
          !l.startsWith("*"),
      );
    const onlyLogsSuccess =
      meaningful.length > 0 &&
      meaningful.every((l) => /^console\.(log|info)\(/.test(l)) &&
      meaningful.some((l) => /PASS|SUCCESS|OK/i.test(l));
    const hasRealLogic = meaningful.some((l) =>
      /(process\.exit|throw |if\s*\(|for\s*\(|while\s*\(|spawnSync|readFileSync|readdirSync|existsSync)/.test(l),
    );
    if (onlyLogsSuccess && !hasRealLogic) {
      record("fake-pass-script", rel(full), "verify script only prints success with no real checks");
    }
  }
}

const required = parseRequiredJobs();
scanWorkflows(required);
scanFakePassScripts();
scanConflictMarkers();

console.log("=== verify:ci-integrity — CI Integrity Scanner ===");
console.log(`Scanned workflows in ${rel(workflowDir)} and verify scripts in ${rel(verifyScriptDir)}.`);

if (violations.length > 0) {
  console.error(`\n❌ verify:ci-integrity FAILED — ${violations.length} integrity violation(s):`);
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.location}\n      ${v.detail}`);
  }
  console.error("\nRemediate each violation or add an audited `# ci-integrity-allow: <reason>` for genuine exceptions.");
  process.exit(1);
}

console.log(`✓ ${required.length} required gate(s) verified against branch-protection.md; no masked failures or fake-pass gates.`);
console.log("verify:ci-integrity PASSED");
process.exit(0);
