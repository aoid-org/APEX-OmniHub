# Attestation Verification Runbook (Proposal)

## Internal verification (GitHub-native)
Use GitHub CLI attestation verification for release artifacts:
```bash
gh attestation verify <artifact-path-or-oci-ref> --repo apexbusiness-systems/APEX-OmniHub
```

## Enterprise/offline verification
1. Download artifact bundle and provenance.
2. Export trusted root/materials from approved internal trust store.
3. Perform offline verification using enterprise-approved verifier against the trusted root.
4. Record verification logs with release evidence.

## Release gate
Release **must fail** if artifact attestation cannot be verified.
