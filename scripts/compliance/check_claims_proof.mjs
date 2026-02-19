import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ledgerPath = resolve('docs/compliance/CLAIMS_LEDGER.yml');
const sitePath = resolve('apps/omnihub-site/src/content/site.ts');

function parseClaimsLedger(content) {
  const claims = [];
  const lines = content.split('\n');
  let currentClaim = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line === 'claims:') {
      continue;
    }

    if (line.startsWith('- claim_id:')) {
      if (currentClaim) {
        claims.push(currentClaim);
      }

      currentClaim = {
        claim_id: line.replace('- claim_id:', '').trim(),
        evidence: [],
      };
      continue;
    }

    if (!currentClaim) {
      continue;
    }

    if (line.startsWith('status:')) {
      currentClaim.status = line.replace('status:', '').trim();
      continue;
    }

    if (line.startsWith('evidence:')) {
      const evidenceValue = line.replace('evidence:', '').trim();
      currentClaim.evidence =
        evidenceValue === '[]' || evidenceValue === ''
          ? []
          : [evidenceValue.replace(/^\[|\]$/g, '').trim()].filter(Boolean);
    }
  }

  if (currentClaim) {
    claims.push(currentClaim);
  }

  return claims;
}

const ledgerSource = readFileSync(ledgerPath, 'utf8');
const siteSource = readFileSync(sitePath, 'utf8');

const claims = parseClaimsLedger(ledgerSource);
const byId = new Map(claims.map((claim) => [claim.claim_id, claim]));

let failed = false;

const verifiedRegex =
  /buildProofTile\('([^']+)'\s*,\s*'[^']+'\s*,\s*'[^']+'\s*,\s*true\)/g;
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
