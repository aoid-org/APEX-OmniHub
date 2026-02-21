import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ledgerPath = resolve('docs/compliance/CLAIMS_LEDGER.yml');
const sitePath = resolve('apps/omnihub-site/src/content/site.ts');

function parseClaimsLedger(content) {
  const claims = [];
  const lines = content.split('\n');
  let currentClaim = null;

  const pushCurrentClaim = () => {
    if (currentClaim) {
      claims.push(currentClaim);
    }
  };

  const valueAfterPrefix = (line, prefix) => line.slice(prefix.length).trim();

  const parseEvidence = (value) => {
    if (value === '[]' || value === '') {
      return [];
    }

    return [value.replaceAll(/(?:^\[|\]$)/g, '').trim()].filter(Boolean);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line === 'claims:') {
      continue;
    }

    if (line.startsWith('- claim_id:')) {
      pushCurrentClaim();

      currentClaim = {
        claim_id: valueAfterPrefix(line, '- claim_id:'),
        evidence: [],
      };
      continue;
    }

    if (!currentClaim) {
      continue;
    }

    if (line.startsWith('status:')) {
      currentClaim.status = valueAfterPrefix(line, 'status:');
      continue;
    }

    if (line.startsWith('evidence:')) {
      currentClaim.evidence = parseEvidence(valueAfterPrefix(line, 'evidence:'));
    }
  }

  pushCurrentClaim();

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
