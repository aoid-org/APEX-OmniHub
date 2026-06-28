# Post-1510 UI/UX Audit Reconciliation

Audit source: APEX-DASH-CREATOR v2.0 Section B — OmniDash UI/UX Audit (score 55/100).
Base commit: `bb47e8d` · Branch: `claude/apex-omnihub-rc-remediation-d9txs1`.
PR #1510 (RC Remediation §0-§19 + TradeLine decommission) merged into `main`.
Every row verified against current repo truth before any fix.

| Audit Finding | Severity | Status | Evidence | Fix Required | Phase |
|---|---|---|---|---|---|
| Inline style abuse (~135 `style={{`) | HIGH | VERIFIED_PRESENT | `apps/omnihub-site/dashboard/OmniDashShell.tsx` (1698 lines, 135 inline blocks) | yes (surgical) | 5 |
| Competing token systems (3) | HIGH | PARTIALLY_FIXED (CCEX-OSE-001) | `dashboard/omniSkinTokens.ts` is now the canonical `T`/`--omni-*` source (`designSystem.ts`/`.tsx` re-export from it); `--od-*` alias-layer migration into `omnidash-layout.css` is still a documented follow-up, not yet implemented; `--color-*` app-wide layer unchanged (out of scope). See `memory/omni-recall/design-token-reconciliation.md`. | partial (alias layer pending) | 4 |
| KPIs buried (not above fold) | HIGH | VERIFIED_PRESENT | Business KPIs only in M03 `SystemHealthOverview` (`dashboard.types.ts:96` hides all m03_*) + 300px rail `SystemHealthRow.tsx`; above-fold = agent orb/OmniSlate/Add-App | yes | 2 |
| KPI labels lack units/timeframe | MEDIUM | VERIFIED_PRESENT | `SystemHealthRow.tsx:48` "Events Tracked" (no unit); only "Alerts 24h" has timeframe | yes | 2,12 |
| Cognitive overload (25+ elements) | MED-HIGH | VERIFIED_PRESENT | shell composition: 7 M03 + 5 rail modules + 8 nav + 8 header + footer | yes | 3 |
| Accessibility / axe hard-skipped | HIGH | VERIFIED_PRESENT | `tests/e2e-playwright/cp-15-a11y-axe.spec.ts:15` `test.skip(true,'APEX-2018: 606 violations…t3 2.38:1, t4 1.28:1')` | yes | 6 |
| Hardcoded "JR" avatar | MEDIUM | VERIFIED_PRESENT | `OmniDashShell.tsx:679` `}}>JR</div>` | yes | 7 |
| Decorative animation on mount bypasses reduced-motion | MEDIUM | VERIFIED_PRESENT | `OmniDashShell.tsx:1507` keyframes injected; inline-styled rings | yes | 9 |
| Duplicate Google Fonts `@import` | MEDIUM | VERIFIED_PRESENT | `omnidash-layout.css:17-18` + `OmniDashShell.tsx:1504` (Space Grotesk twice; one render-blocking) | yes | 10 |
| 500ms shell-wide tick re-render | MEDIUM | VERIFIED_PRESENT | `OmniDashShell.tsx:1434` `useState tick` + `:1478` `setInterval(…,500)` at shell scope | yes | 9 |
| backdrop-filter stacking (~15) | MEDIUM | VERIFIED_PRESENT | header/nav/cards/modals across dashboard | yes (trim) | 10 |
| 1698-line OmniDashShell (>600 rule) | MEDIUM | VERIFIED_PRESENT | `wc -l OmniDashShell.tsx` = 1698 | partial (deferred split) | 5 |
| Responsive cramming (58px header, 220/1fr/220 grid) | HIGH | VERIFIED_PRESENT | `OmniDashShell.tsx:496` `height:58`; `:1396` `gridCols="220px 1fr 220px"` | yes | 11 |
| Invalid CSS `var()`+hex-alpha | HIGH | FIXED (CCEX-OSE-001) | All ~33 instances in `OmniDashShell.tsx` + `M03Panels.tsx` converted to `rgba()`/`omniRgba()`; CI-enforced via `scripts/ci/check-omni-skin.mjs` (`ose-token-contract` job in `apex-governance.yml`) so the pattern cannot regress | done | 4 |
| Empty states weak / NO DATA / zero-point chart | MEDIUM | PARTIAL | `M03Panels.tsx` `No route telemetry`, `NO DATA`, `AgentActivityTimeline` `[{time:'00:00',calls:0}]` | yes | 8,12 |
| Severity color-only (Guardian) | MEDIUM | PARTIAL | `M03Panels.tsx:135` StatusDot color + far-right text badge | yes | 12 |
| Demo/static data honesty | — | MOSTLY_OK | gated by `isDemoMode` (`OmniDashShell.tsx:1450`), labeled `(Simulated)` (`SystemHealthRow.tsx:48`) | no (verify only) | 8 |
| Certification language overstates | HIGH | VERIFIED_PRESENT | `artifacts/production-validation/rc-remediation-certification.md:17,169` "GO for authenticated desktop…user-shoes validation" | yes | 13 |
| AGENTS.md frontmatter malformed | — | FIXED (Phase 0) | opened `---`, closed with 43-dash line; now valid `---` (v2.0.3) | done | 0 |

## Corrections to the audit (repo truth)
- Hardcoded "JR" **is** present at `OmniDashShell.tsx:679` (audit correct).
- No local font binaries exist (`fonts.css` loads via `index.html` link) — full self-host
  not feasible without committing binaries; contract fallback = single optimized load path.
- M03 observability panels are already hidden by default in defaults
  (`dashboard.types.ts:96`); the audit's "6 NO DATA cards render by default" is mitigated at
  the default-layout level but persisted layouts may reveal them — Phase 3 hardens this.

## UNCERTAIN gaps
- UNCERTAIN:[live_layout_persistence] — whether a user's saved
  `omnidash_layout_v2:{userId}:{breakpoint}` overrides the hidden-by-default M03 state;
  resolved during Phase 3 implementation.
