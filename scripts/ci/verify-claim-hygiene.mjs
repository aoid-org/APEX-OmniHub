#!/usr/bin/env node
// APEX-OmniHub Launch-Claim Hygiene Gate (Prompts 5 & 17).
// Scans production-facing copy for high-risk, unproven claims (compliance/certification
// posture, uptime SLAs, fabricated runtime metrics) and fails closed unless the exact
// claim is recorded as proven in docs/release/approved-claims.json. Whether a claim is
// TRUE is a business/legal fact the operator must assert via the allowlist — this gate
// only guarantees no unproven claim ships silently.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const rel = (p) => path.relative(repoRoot, p).replaceAll("\\", "/");

// Production-facing copy. Tests, legal rights disclosures, and generated assets excluded.
const SCAN_ROOTS = [path.join(repoRoot, "apps", "omnihub-site", "src"), path.join(repoRoot, "public")];
const SCAN_EXTS = new Set([".ts", ".tsx", ".html", ".md"]);
const EXCLUDE = [
  /\.test\.|\.spec\.|__tests__/,
  /\/legal\//i, // privacy/terms legitimately reference GDPR/CCPA *rights*, not posture claims
  /privacyPolicy|PRIVACY_POLICY|termsOf|TERMS_OF/i,
];

// High-risk affirmative-claim patterns. Each requires proof in approved-claims.json.
const CLAIM_PATTERNS = [
  { id: "soc2", re: /\bSOC\s?2(\s?(Type\s?II|aligned|certified))?\b/i },
  { id: "iso27001", re: /\bISO\s?27001\b/i },
  { id: "hipaa", re: /\bHIPAA\b/i },
  { id: "compliance-posture", re: /\b(certified|compliant|native compliant)\b/i },
  { id: "uptime-sla", re: /\b\d{2}\.\d{1,2}%\s*(uptime|sla|completion|availability)?/i },
  { id: "uptime-sla", re: /\b(uptime|availability)\b.*\b\d{2}\.\d{1,2}%/i },
  { id: "revenue-metric", re: /\$\s?\d[\d,.]*\s?[KMB]?\s*(MRR|ARR)\b/i },
  { id: "latency-metric", re: /\bp99\b/i },
];

const approvedPath = path.join(repoRoot, "docs", "release", "approved-claims.json");
let approved = [];
if (fs.existsSync(approvedPath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(approvedPath, "utf8"));
    approved = Array.isArray(parsed.approved) ? parsed.approved : [];
  } catch {
    console.error(`❌ verify:claim-hygiene FAILED — could not parse ${rel(approvedPath)}`);
    process.exit(1);
  }
}
// Approved entries match by case-insensitive substring of the offending line.
const isApproved = (line) => approved.some((a) => typeof a === "string" && a.length > 0 && line.toLowerCase().includes(a.toLowerCase()));

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (EXCLUDE.some((re) => re.test(full.replaceAll("\\", "/")))) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else if (SCAN_EXTS.has(path.extname(full))) acc.push(full);
  }
  return acc;
}

const files = SCAN_ROOTS.flatMap((root) => walk(root, []));
const findings = [];

for (const file of files) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (isApproved(line)) return;
    for (const { id, re } of CLAIM_PATTERNS) {
      if (re.test(line)) {
        findings.push({ id, location: `${rel(file)}:${i + 1}`, text: line.trim().slice(0, 120) });
        break;
      }
    }
  });
}

console.log("=== verify:claim-hygiene — Launch-Claim Hygiene Gate ===");
console.log(`Scanned ${files.length} production-copy file(s); ${approved.length} approved claim(s) on the allowlist.`);

if (findings.length > 0) {
  console.error(`\n❌ verify:claim-hygiene FAILED — ${findings.length} unproven public claim(s):`);
  for (const f of findings) {
    console.error(`  [${f.id}] ${f.location}\n      ${f.text}`);
  }
  console.error(
    `\nFor each: either (a) record the exact backing claim string in ${rel(approvedPath)} once it is provably true, ` +
      `or (b) remove / demo-gate the claim. Compliance and SLA claims must be operator-verified before allowlisting.`,
  );
  process.exit(1);
}

console.log("verify:claim-hygiene PASSED");
process.exit(0);
