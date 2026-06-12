---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Attestation Verification Runbook (Proposal)

| Field | Value |
|---|---|
| Document version | 1.2.0 |
| Last updated (UTC) | 2026-05-10 |
| Status | Proposal only |
| Enforcement | Release-blocking on verification failure |

## Internal verification (GitHub-native)
```bash
gh attestation verify <artifact-path-or-oci-ref> --repo apexbusiness-systems/APEX-OmniHub
```

## Enterprise/offline verification
1. Download artifact bundle and provenance.
2. Export trusted root/materials from approved internal trust store.
3. Verify offline with enterprise-approved verifier against trusted root.
4. Archive verification logs alongside release evidence.

## Release gate requirement
Release **must fail** when attestation verification cannot be completed or cannot be trusted.

## Change log
- **2026-05-10 (v1.2.0):** added governance metadata table and explicit release-block wording.
- **2026-05-10 (v1.1.0):** initial attestation runbook published.
