#!/usr/bin/env node
// APEX-OmniHub Armageddon Attestation Gate.
// Re-verifies, offline and on every release check, that the shipped Armageddon
// certificate (apps/omnihub-site/public/certificates/certificatereport.json) carries
// a genuine Ed25519 signature over its own Merkle root — matching the algorithm
// implemented in apexbusiness-systems/Armageddon-Core's
// packages/core/src/core/attestation.ts — against a known-good public key. It also
// fails if ArmageddonCertificationPlaque.tsx's hardcoded display data drifts out of
// sync with the committed certificate, so a stale or edited plaque can never silently
// diverge from the signed report it claims to summarize.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createHash, createPublicKey, verify as cryptoVerify } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const rel = (p) => path.relative(repoRoot, p).replaceAll("\\", "/");

const reportPath = path.join(repoRoot, "apps", "omnihub-site", "public", "certificates", "certificatereport.json");
const plaquePath = path.join(
  repoRoot,
  "apps",
  "omnihub-site",
  "dashboard",
  "components",
  "ArmageddonCertificationPlaque.tsx",
);

// Fetched independently from the live production endpoint
// (https://armageddontest.icu/api/attestation/pubkey) on 2026-07-22. Pinned here
// (rather than fetched live in CI) so this gate has no network dependency and cannot
// be defeated by a spoofed or unreachable endpoint. Rotate this only when the
// Armageddon-Core operator rotates ARMAGEDDON_ATTESTATION_SEED, and only alongside a
// re-signed certificate.
const KNOWN_GOOD_KEY_ID = "37557e9ef2e85246";
const KNOWN_GOOD_PUBLIC_KEY_B64 = "8+lITUS7AyUP9xoocQkR7fNB//tUD3G6NcXwEGI+c1s=";

const ALGORITHM = "ed25519";
const SPEC = "armageddon-attestation/1.0";
const LEAF_PREFIX = Buffer.from([0x00]);
const NODE_PREFIX = Buffer.from([0x01]);

function fail(message) {
  console.error(`❌ verify:armageddon-attestation FAILED — ${message}`);
  process.exit(1);
}

if (!fs.existsSync(reportPath)) {
  fail(`missing ${rel(reportPath)}`);
}
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const a = report.attestation;
if (!a) fail("report has no attestation block");
if (a.algorithm !== ALGORITHM) fail(`unsupported algorithm: ${a.algorithm}`);
if (a.spec !== SPEC) fail(`unsupported spec: ${a.spec}`);
if (a.keyId !== KNOWN_GOOD_KEY_ID || a.publicKey !== KNOWN_GOOD_PUBLIC_KEY_B64) {
  fail(
    `attestation key does not match the known-good key pinned in this script ` +
      `(report keyId=${a.keyId}, expected=${KNOWN_GOOD_KEY_ID}). If the signing key was ` +
      `legitimately rotated, update KNOWN_GOOD_KEY_ID/KNOWN_GOOD_PUBLIC_KEY_B64 after ` +
      `re-confirming the new key against the live /api/attestation/pubkey endpoint.`,
  );
}

// --- Re-derive Merkle root + digest (mirrors createAttestation / renderStandaloneVerifier) ---
function canonicalJson(value) {
  if (value === null) return "null";
  const t = typeof value;
  if (t === "string") return JSON.stringify(value);
  if (t === "boolean") return value ? "true" : "false";
  if (t === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (t === "object") {
    const keys = Object.keys(value)
      .filter((k) => value[k] !== undefined)
      .sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return "null";
}
const sha256Hex = (buf) => createHash("sha256").update(buf).digest("hex");
const leafHash = (payload) => createHash("sha256").update(LEAF_PREFIX).update(payload).digest();
const nodeHash = (l, r) => createHash("sha256").update(NODE_PREFIX).update(l).update(r).digest();
function merkleRoot(leafPayloads) {
  if (leafPayloads.length === 0) return sha256Hex(Buffer.alloc(0));
  let level = leafPayloads.map(leafHash);
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      next.push(nodeHash(level[i], i + 1 < level.length ? level[i + 1] : level[i]));
    }
    level = next;
  }
  return level[0].toString("hex");
}

const meta = {
  runId: report.run_id,
  issuedAt: a.issuedAt,
  verdict: report.verdict,
  score: report.score,
  grade: report.grade,
  seed: report.chaos_seed,
  mode: report.mode,
  targetUrl: report.target_url ?? null,
  spec: SPEC,
};
const leafPayloads = [canonicalJson(meta)];
for (const b of report.batteries) {
  leafPayloads.push(
    canonicalJson({
      batteryId: b.full_id,
      status: b.status,
      iterations: b.tests_run,
      blockedCount: b.blocked,
      breachCount: b.breaches,
      driftScore: b.drift_score,
      duration: b.duration_ms,
      details: b.metrics ?? {},
    }),
  );
}
const recomputedRoot = merkleRoot(leafPayloads);
if (recomputedRoot !== a.merkleRoot) {
  fail(`Merkle root mismatch — recomputed ${recomputedRoot}, report claims ${a.merkleRoot}`);
}

const digestInput = canonicalJson({
  spec: SPEC,
  version: a.version,
  algorithm: ALGORITHM,
  hash: "sha256",
  chainId: a.chainId,
  keyId: a.keyId,
  runId: report.run_id,
  issuedAt: a.issuedAt,
  merkleRoot: a.merkleRoot,
});
const digestBytes = Buffer.from(digestInput, "utf8");
const recomputedDigest = sha256Hex(digestBytes);
if (recomputedDigest !== a.digest) {
  fail(`digest mismatch — recomputed ${recomputedDigest}, report claims ${a.digest}`);
}

const publicKeyObject = createPublicKey({
  key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(a.publicKey, "base64").toString("base64url") },
  format: "jwk",
});
const signatureBytes = Buffer.from(a.signature, "base64");
if (signatureBytes.length !== 64) fail("signature is not 64 bytes");
if (!cryptoVerify(null, digestBytes, publicKeyObject, signatureBytes)) {
  fail("Ed25519 signature is INVALID against the known-good public key");
}

// --- Drift check: the plaque's hardcoded display data must match the signed report ---
if (!fs.existsSync(plaquePath)) fail(`missing ${rel(plaquePath)}`);
const plaqueSrc = fs.readFileSync(plaquePath, "utf8");
function extract(re, label) {
  const m = re.exec(plaqueSrc);
  if (!m) fail(`could not find ${label} in ${rel(plaquePath)}`);
  return m[1];
}
const plaqueRunId = extract(/runId:\s*'([^']+)'/, "runId");
const plaqueMerkleRoot = extract(/merkleRoot:\s*'([^']+)'/, "attestation.merkleRoot");
const plaqueDigest = extract(/digest:\s*'([^']+)'/, "attestation.digest");
const plaqueSignature = extract(/signature:\s*'([^']+)'/, "attestation.signature");
const plaqueKeyId = extract(/keyId:\s*'([^']+)'/, "attestation.keyId");
const plaqueBatteryIds = [...plaqueSrc.matchAll(/code:\s*'([^']+)'/g)].map((m) => m[1]);
const reportBatteryIds = report.batteries.map((b) => b.full_id);

const mismatches = [];
if (plaqueRunId !== report.run_id) mismatches.push(`runId: plaque=${plaqueRunId} report=${report.run_id}`);
if (plaqueMerkleRoot !== a.merkleRoot) mismatches.push(`merkleRoot: plaque=${plaqueMerkleRoot} report=${a.merkleRoot}`);
if (plaqueDigest !== a.digest) mismatches.push(`digest: plaque=${plaqueDigest} report=${a.digest}`);
if (plaqueSignature !== a.signature) mismatches.push(`signature: plaque=${plaqueSignature} report=${a.signature}`);
if (plaqueKeyId !== a.keyId) mismatches.push(`keyId: plaque=${plaqueKeyId} report=${a.keyId}`);
if (plaqueBatteryIds.join(",") !== reportBatteryIds.join(",")) {
  mismatches.push(`batteries: plaque=[${plaqueBatteryIds.join(",")}] report=[${reportBatteryIds.join(",")}]`);
}
if (mismatches.length > 0) {
  fail(`ArmageddonCertificationPlaque.tsx has drifted from the signed certificate:\n  ${mismatches.join("\n  ")}`);
}

// --- Sanity check: the PDF the plaque links to must actually exist ---
const pdfMatch = /pdfPath:\s*'\/certificates\/([^']+)'/.exec(plaqueSrc);
if (pdfMatch) {
  const pdfPath = path.join(repoRoot, "apps", "omnihub-site", "public", "certificates", pdfMatch[1]);
  if (!fs.existsSync(pdfPath)) fail(`plaque links to a PDF that does not exist: ${rel(pdfPath)}`);
}

console.log("=== verify:armageddon-attestation — Armageddon Attestation Gate ===");
console.log(`Run ${report.run_id}: Merkle root and Ed25519 signature verified against known-good key ${KNOWN_GOOD_KEY_ID}.`);
console.log("Plaque display data matches the signed certificate exactly.");
console.log("verify:armageddon-attestation PASSED");
process.exit(0);
