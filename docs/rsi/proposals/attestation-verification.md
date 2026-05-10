# Attestation Verification Runbook (Proposal)

- **Document version:** 1.1.0
- **Last updated (UTC):** 2026-05-10
- **Status:** Proposal only

## Internal verification (GitHub-native)
```bash
gh attestation verify <artifact-path-or-oci-ref> --repo apexbusiness-systems/APEX-OmniHub
```

## Enterprise/offline verification
1. Download artifact bundle and provenance.
2. Export trusted root/materials from approved internal trust store.
3. Verify offline with enterprise-approved verifier against trusted root.
4. Store verification logs with release evidence.

## Release gate requirement
Release **fails** when attestation verification cannot be completed.
