---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# AG2 PROMPT 09 MANIFEST

## RSI Governance & CI Integrity Fixes

**Task:** Close pipeline loopholes that allowed RSI governance escalation and policy gates to be bypassed.

### Executed Actions
1. **`apex-governance.yml` Fail-Closed Fix:**
   - Removed `continue-on-error: true` from the `apex-policy` job. Failures now properly block the gate.
   - Replaced the `|| true` suppress command on the JSON artifact emit step with an explicit JSON fallback `|| echo '{"status":"report-generation-failed"}' > ...`. This ensures artifact failure doesn't silently break the pipeline without using a catch-all suppress.

2. **`rsi-governance.yml` Escalate Block:**
   - Updated the pipeline fail condition: `if [ "$ABORT" = "true" ] || [ "$DECISION" = "escalate" ]; then exit 1; fi`.
   - Previously, only `abort:true` failed the pipeline, meaning `escalate` decisions (which require human review) could still auto-merge if all other CI gates passed. This closes the gap.

3. **`verify-ci-integrity.mjs` Scanner Hardening:**
   - Added `apex-governance.yml` to the `isRequiredWorkflow` list so its steps are validated for bypasses.
   - **Fake Gate Name Detection:** Job IDs are now scanned against a regex blocklist (`always-pass`, `dummy-gate`, `skip-rsi`, etc.) to prevent malicious bypass jobs from satisfying branch protection rules.
   - **Duplicate Job Display-Name Detection:** The scanner now parses `name: ` inside jobs and tracks them globally across all workflows. Duplicate display names cause unresolvable collisions in GitHub branch protection rules (which match on display name).

4. **Branch Protection Docs Update:**
   - Added the `governance-gate` job to the mandatory required status checks list in `docs/release/branch-protection.md`.

5. **Test Fixtures:**
   - Added `tests/ci/ci-integrity.spec.ts` with 11 isolated fixture tests verifying all the scanner rules (fake passes, continue-on-error, `|| true`, duplicate names, missing docs, clean baseline).
