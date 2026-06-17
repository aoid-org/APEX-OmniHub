#!/usr/bin/env node
// APEX-OmniHub Launch-Claim Hygiene Gate (Prompts 5 & 17).
// Scans production-facing copy for high-risk, unproven claims (compliance/certification
// posture, uptime SLAs, fabricated runtime metrics) and fails closed unless the exact
// claim is recorded in docs/release/approved-claims.json with a separate evidence
// artifact. This gate rejects self-attestation: evidence_ref may not point back to
// the allowlist itself, and referenced files/anchors must exist.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const rel = (p) => path.relative(repoRoot, p).replaceAll("\\", "/");

// Production-facing copy. Tests, legal rights disclosures, and generated assets excluded.
const SCAN_ROOTS = [
  path.join(repoRoot, "apps", "omnihub-site"),
  path.join(repoRoot, "apps", "omnihub-site", "src"),
  path.join(repoRoot, "apps", "omnihub-site", "src", "i18n", "locales"),
  path.join(repoRoot, "apps", "omnihub-site", "dashboard"),
  path.join(repoRoot, "public"),
  path.join(repoRoot, "apps", "omnihub-proof", "src"),
];
const SCAN_EXTS = new Set([".json", ".html", ".md", ".ts", ".tsx", ".js", ".jsx"]);
const EXCLUDE = [
  /\.test\.|\.spec\.|__tests__/,
  /\/legal\//i, // privacy/terms legitimately reference GDPR/CCPA *rights*, not posture claims
  /privacyPolicy|PRIVACY_POLICY|termsOf|TERMS_OF/i,
  /\/node_modules\//,
  /\/dist\//,
  /\/build\//,
  /\/coverage\//,
];

// High-risk affirmative-claim patterns. Each requires proof in approved-claims.json.
const CLAIM_PATTERNS = [
  { id: "soc2", re: /\bSOC\s?2(\s?(Type\s?II|aligned|certified))?\b/i },
  { id: "iso27001", re: /\bISO\s?27001\b/i },
  { id: "hipaa", re: /\bHIPAA\b/i },
  { id: "gdpr", re: /\bGDPR\b/i },
  { id: "eu-ai-act", re: /\bEU\s+AI\s+Act\b/i },
  { id: "eu-ai-act", re: /\bArticle\s+14\b|\bArt\.\s*14\b/i },
  { id: "eu-ai-act", re: /\bArt\.\s*30\b|\bArticle\s+30\b/i },
  { id: "compliance-posture", re: /\b(certified|compliant|native compliant)\b/i },
  { id: "regulated-industries", re: /\bregulated\s+industries\b/i },
  { id: "independent-audit", re: /\bindependent\s+audit\b/i },
  { id: "attestation", re: /\battested\b|\battestation\b/i },
  { id: "baa-support", re: /\bBAA\s+(support|agreement|covered)\b/i },
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
const normalize = (value) => String(value).replace(/\s+/g, " ").trim().toLowerCase();
const ALLOWED_CATEGORIES = new Set(["externally_certified", "internally_aligned", "architecture_ready", "demo_sample_metric"]);
const approvalViolations = [];

function anchorExists(text, anchor) {
  if (!anchor) return true;
  const normalizedAnchor = normalize(anchor).replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-");
  return text.split(/\r?\n/).some((line) => {
    const heading = line.match(/^#+\s+(.+)$/);
    if (!heading) return false;
    const slug = normalize(heading[1]).replace(/[^a-z0-9 -]/g, "").replace(/\s+/g, "-");
    return slug === normalizedAnchor;
  });
}

function validateEvidenceRef(entry, index) {
  const claim = typeof entry === "string" ? entry : entry?.claim;
  if (typeof entry === "string") {
    approvalViolations.push({ index, claim, reason: "legacy string approvals are not evidence-bound" });
    return false;
  }
  if (!ALLOWED_CATEGORIES.has(entry?.category)) {
    approvalViolations.push({ index, claim, reason: `category must be one of ${[...ALLOWED_CATEGORIES].join(", ")}` });
    return false;
  }
  const evidenceRef = entry?.evidence_ref;
  if (typeof evidenceRef !== "string" || !evidenceRef.trim()) {
    approvalViolations.push({ index, claim, reason: "missing evidence_ref" });
    return false;
  }
  const [refPath, anchor] = evidenceRef.split("#");
  const normalizedRef = refPath.replaceAll("\\", "/");
  if (normalizedRef === rel(approvedPath)) {
    approvalViolations.push({ index, claim, reason: "evidence_ref must not point back to approved-claims.json" });
    return false;
  }
  const absoluteRef = path.resolve(repoRoot, normalizedRef);
  if (!absoluteRef.startsWith(repoRoot + path.sep) || !fs.existsSync(absoluteRef) || fs.statSync(absoluteRef).isDirectory()) {
    approvalViolations.push({ index, claim, reason: `evidence file not found: ${normalizedRef}` });
    return false;
  }
  const evidenceText = fs.readFileSync(absoluteRef, "utf8");
  if (anchor && !anchorExists(evidenceText, anchor)) {
    approvalViolations.push({ index, claim, reason: `evidence anchor not found: ${evidenceRef}` });
    return false;
  }
  return true;
}

const validApproved = approved.filter((entry, index) => validateEvidenceRef(entry, index));
const approvedSet = new Set(validApproved.map((a) => a?.claim).filter((a) => typeof a === "string" && a.trim()).map(normalize));
const isApproved = (line) => approvedSet.has(normalize(line));

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

const files = [...new Set(SCAN_ROOTS.flatMap((root) => walk(root, [])))];
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

if (approvalViolations.length > 0) {
  console.error(`\n❌ verify:claim-hygiene FAILED — ${approvalViolations.length} invalid approved claim entr${approvalViolations.length === 1 ? "y" : "ies"}:`);
  for (const v of approvalViolations) {
    console.error(`  [approved:${v.index}] ${String(v.claim ?? "<missing claim>").slice(0, 120)}\n      ${v.reason}`);
  }
  process.exit(1);
}

if (findings.length > 0) {
  console.error(`\n❌ verify:claim-hygiene FAILED — ${findings.length} unproven public claim(s):`);
  for (const f of findings) {
    console.error(`  [${f.id}] ${f.location}\n      ${f.text}`);
  }
  console.error(
    `\nFor each: either (a) record the exact backing claim string in ${rel(approvedPath)} once it is provably true, ` +
      `or (b) remove / demo-gate the claim. Certification, compliance, independent-audit, and SLA claims require separate evidence artifacts before allowlisting.`,
  );
  process.exit(1);
}

console.log("verify:claim-hygiene PASSED");
process.exit(0);
