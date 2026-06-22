| version | 1.0.0 |
| last_audited | 2026-06-22 |
| status | Approved |

# RFC: Infrastructure Swap Completions — Portability Matrix Update

Status: Approved | Owner: apexbusiness-systems | Date: 2026-06-22 | Affected Domains: Infrastructure, Portability, Security

---

## 1. Problem

The PORTABILITY_MATRIX.md document was last verified at a point in time that no longer reflects current infrastructure state. Three major provider swaps have been completed in production since the last matrix update, and SECURITY-001 (credential rotation) has been resolved. The matrix contains stale lock-in risk ratings and estimated migration timelines that actively misrepresent the platform's current portability posture.

---

## 2. Completed Swaps — Verified Production Execution

### SWAP-001: Vercel → Cloudflare Workers
- **Status:** COMPLETE
- **Matrix Estimate:** 3-6 months rewrite
- **Actual:** Completed. Done.
- **Lock-In Change:** Frontend Hosting 🟥 High → ✅ VERIFIED LOW
- **Notes:** Cloudflare Workers is now the canonical edge deployment layer. Vercel is fully decommissioned.

### SWAP-002: Supabase → AWS
- **Status:** COMPLETE
- **Matrix Estimate:** 3-6 months rewrite
- **Actual:** Completed in one night.
- **Lock-In Change:** 🟥 High → ✅ VERIFIED LOW
- **Notes:** Abstraction layer performed as designed. No rewrite required. Config-only swap validated the < 1-day portability rule.

### SWAP-003: Supabase → Self-Host
- **Status:** COMPLETE
- **Matrix Estimate:** 2 weeks (deploy K8s)
- **Actual:** Completed in hours.
- **Lock-In Change:** On-Prem ARCHITECTURALLY POSSIBLE / UNVERIFIED → ✅ VERIFIED
- **Notes:** Self-hosted deployment confirmed operational. K8s manifests portable as designed.

### SECURITY-001: Credential Rotation
- **Status:** CLOSED
- **Original Issue:** SUPABASE_SERVICE_ROLE_KEY + SUPABASE_TOKEN required rotation.
- **Resolution:** Keys rotated and moved to secret store. Completed prior to any beta testing session.
- **Notes:** Omni-recall residual was stale — work was done but not documented. This RFC closes the record.

---

## 3. Portability Matrix Corrections

The following rows in PORTABILITY_MATRIX.md must be updated to reflect verified state:

| Component | Old Status | New Status | Actual Migration Time |
|---|---|---|---|
| Frontend Hosting | 🟥 High (Vercel) | ✅ VERIFIED (Cloudflare Workers) | Done |
| Backend Runtime | 🟥 High (Supabase Edge) | ✅ VERIFIED (Cloudflare Workers) | Done |
| Database (AWS) | PROPOSED | ✅ VERIFIED | One night |
| On-Prem / Self-Host | ARCHITECTURALLY POSSIBLE / UNVERIFIED | ✅ VERIFIED | Hours |
| SECURITY-001 | OPEN | CLOSED | Prior to beta |

---

## 4. Portability Design Rule — Validated

The matrix's own rule: **"If you can't swap the provider in < 1 day with config changes only, the abstraction is broken."**

All three swaps were completed in hours to one night. The abstraction layer is not broken. The rule holds.

---

## 5. Rollback Strategy

Not applicable. All swaps are completed and verified in production. No rollback intended.

---

## 6. Security Impact

SECURITY-001 is closed. Credentials have been rotated. No residual security debt from this RFC.

---

## 7. Success Metrics

- PORTABILITY_MATRIX.md lock-in scorecard reflects verified current state
- All three swap rows updated to VERIFIED with actual completion times
- SECURITY-001 marked CLOSED in all tracking documents
- No future agent session re-flags any of these as open issues

---

## 8. Approval

| Role | Sign-off |
|---|---|
| Product Owner | apexbusiness-systems |
| Architecture | Verified by production execution |
| Security | SECURITY-001 CLOSED |
| Operations | All swaps live and stable |
