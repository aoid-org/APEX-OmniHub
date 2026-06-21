# APEX-OmniHub Claim-Approved Production Release Evidence

## Decision
READY_FOR_OWNER_RELEASE_APPROVAL

All technical truth-gating and capability build-up that can be completed and
verified in this environment is done. The public Tech Specs page now renders
ONLY certified-functioning claims from a single source of truth. Production
deploy, merge, and the remaining owner-validation items are owner-controlled.

## Release Candidate
- Branch: `claude/modest-maxwell-oqflsj`
- Commits: `faa4b08f` (ledger + OmniSentry), `61b859b7` (OmniTrace), `7cc6affc` (Eyes/Identity foundation)
- PR: none opened (owner action)
- Production URL: https://apexomnihub.icu/tech-specs (after owner deploy)
- Evidence generated at: 2026-06-21

## Single Source of Truth
- `apps/omnihub-site/src/content/featureTruth.ts` — every public claim, once, with an evidence-backed status.
- `apps/omnihub-site/src/content/site.ts` — `techSpecsConfig.sections` is projected from the ledger (CERTIFIED only); no hardcoded claim list.
- Gate tests: `tests/release/claim-truth.spec.ts` (+ per-capability surface tests). Full `tests/release/` suite: 49 passing.

## Capabilities Built Up This Session (per "build up, do not downgrade")
| # | Capability | Outcome | Surface | Evidence |
|---|---|---|---|---|
| 1 | OmniSentry self-healing monitor | CERTIFIED | `/omni-sentry` live panel drives real `getHealthStatus()`; activated at startup | `OmniSentryPanel.tsx`, `pages/OmniSentry.tsx`, `src/main.tsx`, `omni-sentry-surface.spec.ts` |
| 2 | OmniTrace decision replay | CERTIFIED (scoped) | `/omni-trace` replays real RLS-scoped `audit_logs` | `OmniTracePanel.tsx`, `lib/omniTrace.ts`, `omni-trace-surface.spec.ts` |
| 3 | Eyes multimodal vision | FOUNDATION (owner E2E validation) | built, not routed/visible | `lib/eyes-vision.ts`, `byom/EyesVisionInput.tsx`, `byom-proxy` multimodal, `eyes-vision-surface.spec.ts` |
| 4 | Identity WebAuthn | FOUNDATION (signature-verify blocker) | built, NOT exposed in Login | `identity-webauthn/*`, `webauthnClient.ts`, `PasskeySection.tsx`, `identity-webauthn-surface.spec.ts` |

## Claim Certification Matrix (by category)
CERTIFIED_FUNCTIONING (visible on Tech Specs):
- Brain: Saga compensation/rollback; FastAPI/Python runtime; pgvector RAG.
- Identity: Zero-Trust Device Registry.
- Conscience: Tri-Force (Guardian→Planner→Executor); MAN Mode gates; Human-oversight policy; Canonical semantic event normalization.
- Memory: Structured audit logging; OmniTrace decision replay.
- Immune: OmniSentry self-healing monitor (live); Gitleaks + TruffleHog (CI); OMEGA hardening.

FOUNDATION / REQUIRES_OWNER_VALIDATION (not visible):
- Brain: Temporal engine (SDK present, worker reachability unproven).
- Senses: Ears (voice ingress), Touch (Capacitor), Capacitor native, Eyes (built; live-model validation).
- Identity: enclave signing, FaceID/TouchID (real device), no-biometric-egress, hardware receipts, WebAuthn (signature verification).
- Memory: 365-day retention (actual policy is 90 days), DPIA/FRIA docs.

HIDDEN_FOR_RELEASE (unsupported as worded — removed from production):
- Brain: Workflow viz `:8080`. Senses: Whisper offline. Conscience: OmniLink port `9876`.
- Memory: Full reconstruction of any agent chain (no correlation id persisted).
- Immune: Armageddon "40,000 iterations" and "0% escape rate" (harness real, but config is 10,000/battery @ <0.01% threshold; no committed evidence artifact).

## Hidden / Downgraded Public Claims (homepage, beyond Tech Specs)
| Claim | Reason | New Copy |
|---|---|---|
| Proof tile "Armageddon L7 — VERIFIED" | No committed evidence artifact | "Secret Scanning — CI-ENFORCED" |
| Fortress "Biometric hardware enclave signing (FaceID/TouchID)" | Not device-validated | "Tri-Force governance (Guardian → Planner → Executor)" |
| Fortress "Forensic replay via OmniTrace" | Replay scoped, not full-chain | "Gitleaks + TruffleHog secret scanning in CI" |
| Hero "Execute … biometric gates" | Biometric gating uncertified | "… Manual Approval Node gates …" |

## Component Reuse / Duplication Audit
| Area | Reused | New | Why new |
|---|---|---|---|
| Audit store | `audit_logs` + RLS | OmniTrace read-only view | No second audit system; AuditsModule (compliance widget) untouched |
| Device registry | `device_registry` table | WebAuthn metadata in `device_info` jsonb | No second registry; no new table |
| Monitor | `src/lib/omni-sentry.ts` runtime | site-native panel | Root `@`-aliased toggle can't build under site `@`; panel surfaces same lib |
| BYOM | `byom-proxy` edge fn | minimal multimodal content support | Single-handler change, not a fork; backward-compatible |
| Claim config | n/a | `featureTruth.ts` | No prior single claim source existed |

## CI / Release Gates
| Gate | Result |
|---|---|
| Release tests (`tests/release/`) | 49 passed |
| Production build (`npm run build`) | green (~9s) |
| Site typecheck (new files) | clean (pre-existing baseline errors only) |
| Claim-truth gate | passing (no unsupported literal in shipped site content) |

## Security / Privacy
- No insecure auth surface ships: WebAuthn passkey UI removed from Login until signature verification is implemented.
- No image bytes logged (Eyes); no biometric data or private keys stored (WebAuthn stores only public-key metadata).
- No secrets in code; edge functions inert until owner deploys.

## Rollback / Disable Path
- Feature flags: certified surfaces are additive routes; remove route entries in `App.tsx` to disable.
- PR revert: per-capability commits (`faa4b08f`, `61b859b7`, `7cc6affc`) revert cleanly.
- Cloudflare: site is static; redeploy previous build to roll back.
- DB: no migrations applied to production by this work.

## Owner Actions Remaining
1. Review + merge branch `claude/modest-maxwell-oqflsj`; deploy site (Cloudflare).
2. Eyes: run client→`byom-proxy`→vision E2E with a live BYOM key + Deno check of edge changes; certify `senses.eyes` if green.
3. Identity: complete COSE/ECDSA assertion signature verification, then re-expose PasskeySection + certify `identity.webauthn`; validate FaceID/TouchID on a real device for `identity.faceid`.
4. Optional: persist a correlation id into `audit_logs.metadata` to unlock `memory.fullChain`; extend retention to 365 days if desired.

## Final Recommendation
Ship the certified, truthful build. The public Tech Specs page is now claim-accurate. Eyes and Identity are real foundation gated behind explicit owner validation/completion — not faked, not exposed.
