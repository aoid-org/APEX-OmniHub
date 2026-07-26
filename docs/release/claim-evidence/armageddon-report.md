# Armageddon Level 7 Certification — Evidence Record

This document backs the "CERTIFIED" / attestation claims rendered by
`ArmageddonCertificationPlaque.tsx` and shipped as
`apps/omnihub-site/public/certificates/certificatereport.{json,md}`. It
replaces an earlier version of this file that described a different,
unrelated run (`run-20260704-pr176-clean`, ECDSA-P256, 33 batteries) and
could not honestly back the artifact actually shipped in this repo.

## What This Certifies (and Does Not)

The Armageddon Test Suite is a product built and operated by APEX Business
Systems Ltd. (repo `apexbusiness-systems/Armageddon-Core`, site
`https://armageddontest.icu`) that runs adversarial security batteries
against a target system and cryptographically signs the result.

**It is not an independent third-party audit, and it is not SOC 2, ISO, or
any recognized compliance certification.** The shipped certificate says so
explicitly in its own `legal_notice` field. "CERTIFIED" here means: the
named build, at the named commit/deploy, passed the Armageddon Level 7
battery suite under live-fire mode, with a tamper-evident, independently
re-verifiable cryptographic receipt proving the report wasn't altered after
signing. Category `internally_aligned` in `approved-claims.json` reflects
that scope: real, verifiable, self-administered — not externally audited.

## Verified Run

- **Run ID:** `eb989339-e991-4e6d-b271-459401a035e2`
- **Issued:** 2026-07-22T16:31:33.61Z
- **Target:** APEX-OmniHub Orchestrator API (staging),
  `https://apex-orchestrator-api-staging.onrender.com`
- **Mode:** `LIVE_FIRE`, seed `3444721184`
- **Verdict:** `CERTIFIED`, score 100/100, grade A

## Battery Results

| Battery | Status | Iterations | Blocked | Breaches |
|---|---|---|---|---|
| B10 Goal Hijack | PASSED | 5 | 5 | 0 |
| B11 Tool Misuse | PASSED | 5 | 5 | 0 |
| B12 Memory Poison | PASSED | 5 | 5 | 0 |
| B13 Supply Chain | PASSED | 5 | 5 | 0 |
| B14 Indirect Injection | PASSED | 5 | 5 | 0 |

## Cryptographic Attestation — Independently Verified

The attestation block (`spec: armageddon-attestation/1.0`, `algorithm:
ed25519`) is produced by real signing code, not placeholder data:

- Merkle tree + Ed25519 signing: `packages/core/src/core/attestation.ts`
  (`createAttestation`) in `Armageddon-Core`.
- Key derivation from the provisioned `ARMAGEDDON_ATTESTATION_SEED` secret:
  `packages/shared/src/attestation-key.ts` (`deriveAttestationKeyMaterial`).
- Public key publication: `GET /api/attestation/pubkey`
  (`armageddon-site/src/app/api/attestation/pubkey/route.ts`), deployed on
  Cloudflare Workers at `armageddontest.icu`.

On 2026-07-22, this claim was independently checked (not taken on trust)
against the live production endpoint:

```
$ curl https://armageddontest.icu/api/attestation/pubkey
{"spec":"armageddon-attestation/1.0","algorithm":"ed25519",
 "keyId":"37557e9ef2e85246",
 "publicKey":"8+lITUS7AyUP9xoocQkR7fNB//tUD3G6NcXwEGI+c1s=", ...}
```

That `keyId`/`publicKey` matches the attestation block embedded in
`certificatereport.json` exactly. Re-deriving the Merkle root and digest
from the report's raw battery data (using the same algorithm as
`createAttestation`) and verifying the Ed25519 signature against the
independently-fetched public key returns `[VALID]`:

```
merkleRoot 3eee864cbbaaeaedf9c619f1f19c7621b9cacdf753671ca1a6e82b26b0e73073
digest     ed90801169c74b2ece1ff84fa0dbc3928322805ab81f5f6e0601fbc3a77a891b
keyId      37557e9ef2e85246
[VALID]
```

## Reproducing the Verification

This is enforced continuously, not just checked once by hand:
`scripts/ci/verify-armageddon-attestation.mjs` (wired into `verify:release`
as `verify:armageddon-attestation`) re-runs this exact check against the
committed `certificatereport.json` on every release verification, using a
public key pinned in that script from the endpoint above, and additionally
fails if `ArmageddonCertificationPlaque.tsx`'s hardcoded `ARMAGEDDON_CERT_DATA`
ever drifts out of sync with the committed JSON.

*Legal Notice (verbatim from the shipped certificate): This certification
is valid only for the specific build, configuration, and environment tested
at the time of this run. It does not constitute SOC 2, ISO, or compliance
certification, nor does it guarantee breach prevention.*
