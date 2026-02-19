import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

const ledgerPath = resolve('docs/compliance/CLAIMS_LEDGER.yml');
const sitePath = resolve('apps/omnihub-site/src/content/site.ts');

const ledger = yaml.load(readFileSync(ledgerPath, 'utf8'));
const siteSource = readFileSync(sitePath, 'utf8');

const claims = Array.isArray(ledger?.claims) ? ledger.claims : [];
const byId = new Map(claims.map((claim) => [claim.claim_id, claim]));

let failed = false;

const verifiedRegex = /buildProofTile\('([^']+)'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*true\)/g;
const verifiedIds = [];
let match = verifiedRegex.exec(siteSource);

while (match) {
  verifiedIds.push(match[1]);
  match = verifiedRegex.exec(siteSource);
}

for (const claimId of verifiedIds) {
  const entry = byId.get(claimId);
  const hasEvidence = Array.isArray(entry?.evidence) && entry.evidence.length > 0;

  if (!entry || entry.status !== 'verified' || !hasEvidence) {
    console.error(`[UNPROVEN] verified claim ${claimId} lacks verified ledger evidence`);
    failed = true;
  }
}

if (siteSource.includes('third-party security audit')) {
  const auditClaim = byId.get('third-party-security-audit');
  const hasEvidence = Array.isArray(auditClaim?.evidence) && auditClaim.evidence.length > 0;

  if (!auditClaim || !hasEvidence) {
    console.error('[MISSING] third-party security audit text requires ledger evidence path');
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('✓ claims-proof: PASS');
