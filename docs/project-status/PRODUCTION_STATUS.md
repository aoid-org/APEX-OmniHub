<!-- APEX_DOC_STAMP: VERSION=v1.5.1-EVIDENCE-LEDGER | LAST_UPDATED=2026-05-07 -->
# APEX OmniHub — Production Status Evidence Ledger

## Evidence Contract

This document is an evidence ledger, not a blanket production certification. APEX OmniHub's canonical runtime and deployment truth is maintained in `docs/architecture/CANONICAL_TRUTH.md`; status claims here are valid only when backed by command output, dated audit artifacts, or linked runbooks in this repository.

## Current Verifiable Baseline

| Area | Evidence source | Current statement |
| --- | --- | --- |
| Frontend runtime | `docs/architecture/CANONICAL_TRUTH.md` | React 18.3.1 + Vite 7 is canonical. |
| Deployment topology | `docs/architecture/CANONICAL_TRUTH.md` | Cloudflare Pages-aligned web deployment is canonical. |
| Supabase posture | `docs/audits/SUPABASE_SECURITY_AUDIT_2026_05_04.md` | Public-schema RLS and SECURITY DEFINER hardening are documented as of 2026-05-04. |
| OmniBridge persistence | `docs/architecture/CANONICAL_TRUTH.md` | `omnibridge_events`, `omnibridge_events_dlq`, and `omnibridge_control_audit` are canonical persistence tables. |
| Legacy v1.5.1 login incident | Historical section below | Resolved on 2026-03-25 per prior ledger text; re-run current gates before reusing the pass counts. |

## Required Fresh Verification Before Any Release Claim

Run these from the repository root and archive output before stating that a build is production-ready:

```bash
bun run check:react
bun run typecheck
bun run lint
bun run test
bun run docs:check
bun run build
npm audit --omit=dev --audit-level=high
```

A release note may say **production-ready** only when the exact command output above is attached to the release evidence bundle. Historical pass counts must not be represented as current pass counts.

## Historical Incident Record — v1.5.1 Login Hotfix

| Detail | Value |
| --- | --- |
| Incident | Login unavailable |
| Resolution date | 2026-03-25 |
| Reported root cause | Empty `[env.production]` / `[env.preview]` in `wrangler.toml` prevented Cloudflare Pages env var injection at build time. |
| Reported fix scope | Removed empty env sections, added icon fallback, added login regression coverage. |
| Evidence status | Historical. Re-run the current verification commands before using this as release evidence. |

## Status Language Rules

- Use **verified on `<date>` by `<command>`** for local runnable proof.
- Use **historical audit** for third-party or older internal audit artifacts.
- Do not use **PRODUCTION CERTIFIED**, **CLEARED for global rollout**, or aggregate pass counts unless the evidence bundle includes fresh command output from the current branch.
