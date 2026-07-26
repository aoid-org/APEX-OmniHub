#!/usr/bin/env node
// APEX-OmniHub Ops-Doc Claim Integrity Gate.
//
// docs/APEX_AGENT_OPERATIONS.md accumulates dated change-history entries. `docs:check`
// only validates links/pointers inside memory/omni-recall/docs — it never touches this
// file, and nothing else checks whether a change-history entry's claim is actually true.
// That gap let a fabricated "resolved axios/hono/protobufjs vulnerabilities" entry ship
// to `main` in PR #1646 (commit 4db5a5e made zero package-lock.json changes) — caught
// only by manual `git show --stat` inspection after the fact
// (memory/omni-recall/wiki/corrections/005-fabricated-dependency-audit-claim.md).
//
// This gate automates that exact manual check: for every section that cites a commit
// SHA alongside a "**Changed files:**" / "**Changed critical runtime path(s):**" line,
// verify the cited commit's real diff actually touches at least one named file.
//
// Deliberately conservative (false-negative-safe): any section, SHA, or path this
// script cannot confidently parse or resolve is skipped, not failed. It only fails
// when a citable commit exists and provably contradicts the claim next to it.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const docPath = path.join(repoRoot, "docs", "APEX_AGENT_OPERATIONS.md");

if (!fs.existsSync(docPath)) {
  console.log("[ops-doc-claims] docs/APEX_AGENT_OPERATIONS.md not found — nothing to check.");
  process.exit(0);
}

const lines = fs.readFileSync(docPath, "utf8").split(/\r?\n/);

// --- 1. Split into sections by ## / ### headings. ---
const sections = [];
let current = { heading: "(preamble)", start: 0, text: [] };
lines.forEach((line, i) => {
  if (/^#{2,3}\s+/.test(line)) {
    sections.push(current);
    current = { heading: line.trim(), start: i + 1, text: [] };
  } else {
    current.text.push(line);
  }
});
sections.push(current);

// --- 2. Helpers ---
const CHANGED_LABEL_RE = /^\*\*Changed (?:files|critical runtime paths?):\*\*/;
const SHA_TOKEN_RE = /`([0-9a-fA-F]{7,40})`/g;
const PATH_EXT_RE = /\.(json|md|mjs|ts|tsx|js|jsx|py|sql|ya?ml|toml|css|html?|txt|cjs|mts|lock)$/i;
const BARE_CONFIG_ALLOW = new Set(["package.json", "package-lock.json", "bun.lock", "bun.lockb", ".npmrc"]);

function looksLikeHexNotDecimal(token) {
  // Migration/timestamp IDs (e.g. 20260226000001) are pure decimal and coincidentally
  // valid hex; a real abbreviated git SHA is uniformly random and, at 7+ chars, all but
  // certain to contain at least one a-f letter. Excluding pure-decimal tokens keeps
  // migration filenames from being misread as commit references.
  return /[a-fA-F]/.test(token);
}

function resolveCommit(token) {
  try {
    execSync(`git cat-file -e ${token}^{commit}`, { cwd: repoRoot, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function commitChangedFiles(sha) {
  try {
    const out = execSync(`git diff ${sha}~1..${sha} --name-only`, {
      cwd: repoRoot,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf8",
    });
    return out.split(/\r?\n/).filter(Boolean);
  } catch {
    // Root commit, merge commit ambiguity, or unresolvable parent — skip, don't fail.
    return null;
  }
}

function expandBraces(token) {
  // e.g. certificatereport.{json,md} -> [certificatereport.json, certificatereport.md]
  const m = /^(.*)\{([^}]+)\}(.*)$/.exec(token);
  if (!m) return [token];
  const [, prefix, options, suffix] = m;
  return options.split(",").map((opt) => `${prefix}${opt.trim()}${suffix}`);
}

function extractPathCandidates(text) {
  const candidates = [];
  const backtickRe = /`([^`]+)`/g;
  let m;
  while ((m = backtickRe.exec(text))) {
    const token = m[1];
    if (/^[0-9a-fA-F]{7,40}$/.test(token)) continue; // a SHA, not a path
    if (!token.includes("/") && !PATH_EXT_RE.test(token) && !BARE_CONFIG_ALLOW.has(token)) continue;
    for (const expanded of expandBraces(token)) {
      candidates.push(expanded);
    }
  }
  return candidates;
}

// --- 3. Evaluate each section. ---
const findings = [];
let checkedSections = 0;

for (const section of sections) {
  const text = section.text.join("\n");
  const changedLineIdx = section.text.findIndex((l) => CHANGED_LABEL_RE.test(l.trim()));
  if (changedLineIdx === -1) continue;

  // The file list may wrap onto following lines until a blank line.
  const block = [];
  for (let i = changedLineIdx; i < section.text.length; i++) {
    if (i > changedLineIdx && section.text[i].trim() === "") break;
    block.push(section.text[i]);
  }
  const pathCandidates = [...new Set(extractPathCandidates(block.join("\n")))];
  if (pathCandidates.length === 0) continue;

  const shaCandidates = [...new Set([...text.matchAll(SHA_TOKEN_RE)].map((m) => m[1]))].filter(
    looksLikeHexNotDecimal,
  );
  const resolvedShas = shaCandidates.filter(resolveCommit);
  if (resolvedShas.length === 0) continue; // nothing citable to verify against — skip.

  checkedSections++;

  const allChangedFiles = new Set();
  let anyDiffResolved = false;
  for (const sha of resolvedShas) {
    const files = commitChangedFiles(sha);
    if (files === null) continue;
    anyDiffResolved = true;
    for (const f of files) allChangedFiles.add(f);
  }
  if (!anyDiffResolved) continue; // couldn't diff any cited commit (merges/root) — skip.

  const matched = pathCandidates.filter((p) =>
    [...allChangedFiles].some((f) => f === p || f.endsWith(`/${p}`) || p.endsWith(`/${f}`)),
  );

  if (matched.length === 0) {
    findings.push({
      heading: section.heading,
      claimedFiles: pathCandidates,
      citedShas: resolvedShas,
    });
  }
}

console.log("=== check:ops-doc-claim-integrity — Ops-Doc Claim Integrity Gate ===");
console.log(
  `Scanned ${sections.length} section(s) of docs/APEX_AGENT_OPERATIONS.md; ${checkedSections} had a citable commit + file-change claim to cross-check.`,
);

if (findings.length > 0) {
  console.error(`\n❌ check:ops-doc-claim-integrity FAILED — ${findings.length} unverifiable claim(s):`);
  for (const f of findings) {
    console.error(`\n  ${f.heading}`);
    console.error(`    Cited commit(s): ${f.citedShas.join(", ")}`);
    console.error(`    Claimed changed files: ${f.claimedFiles.join(", ")}`);
    console.error(`    None of the claimed files appear in any cited commit's actual diff.`);
  }
  console.error(
    "\nFor each: either cite the commit that actually made this change, or correct the entry to " +
      "describe what really happened. See memory/omni-recall/wiki/corrections/005-fabricated-dependency-audit-claim.md " +
      "for the exact failure mode this gate exists to catch.",
  );
  process.exit(1);
}

console.log("check:ops-doc-claim-integrity PASSED");
process.exit(0);
