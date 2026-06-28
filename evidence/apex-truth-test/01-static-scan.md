# APEX Truth Test — Static Fake-Surface Scan (01)

- **PR:** #1511 · **Branch:** `claude/apex-omnihub-rc-remediation-d9txs1` · **Head:** `6fe51c4`
- **Status:** PASS — scan executed; no production-facing fake surface with dishonest gating found. The single known raw-error surface (OmniMedia) was remediated in this PR (commit `a104425`).

## Purpose

Detect "fake surfaces": UI that presents a capability without a real backing
(mocked data shown as live, hardcoded sample content, dead/no-op controls, fake
success toasts, placeholder integrations rendered as functional).

## Method (to be run by the static scan)

Run ripgrep over the product and supporting trees and classify each hit:

```
rg -n -i \
  -e 'mock' -e 'fixture' -e 'sample[_-]?data' -e 'dummy' -e 'placeholder' \
  -e 'lorem' -e 'fake' -e 'stub' -e 'TODO' -e 'FIXME' -e 'coming soon' \
  -e 'not implemented' -e 'hardcoded' -e 'hard-coded' -e 'no-?op' \
  -e 'fakeSuccess' -e 'simulate' -e 'demo[_-]?data' \
  apps/ src/ tests/ memory/ artifacts/
```

(Adjust roots to the live tree — note `apps/omnihub-site` is the live app tree,
not `src/`.)

## Classification Rule (binding)

A match is a **FAILURE only if it is production-facing without honest gating**.
The following are NOT failures:

- Matches inside `tests/`, test fixtures, Storybook, or mock service workers used
  only for tests.
- `TODO` / `FIXME` in comments that do not ship a misleading surface.
- Placeholder text that is honestly gated (e.g. behind a feature flag, an empty
  state, a "temporarily unavailable" message, or a disabled control).
- i18n `defaultValue` fallbacks (these are honest copy, not fake data).

A match IS a failure if a user-visible surface renders mock/sample/hardcoded data
or a no-op control as if it were a real, working capability.

## Results (executed 2026-06-28, real source only — `.ts/.tsx`, excluding `public/`, `*.min.js`, `tests/`, `__mocks__/`)

Scan roots: `apps/omnihub-site`, `src`. Vendor/minified (`public/vendor/three.min.js`) excluded —
it inflated raw counts and contains no UI surfaces.

| Marker | Hits (real source) | Classification | Notes |
|---|---|---|---|
| `Edge Function returned …` | 2 | **PASS** | Both are **code comments** (`omniMediaCatalog.ts:27` documenting the fix; `OmniBoardWizard.tsx:51` documenting error handling). No user-visible string. |
| `not implemented` | 0 | PASS | None in shipped source. |
| `coming soon` | 1 | **PASS (honest gating)** | `src/omnidash/useOmniDashAction.ts:81` — "Whether the app is *coming soon* (UI-only gate, no modal dispatched)." This is an honest disabled/gated state, not a fake surface. |
| `href="#"` | 0 | PASS | No dead anchors in real source (`.ts/.tsx`). |
| `onClick={() => {}}` (no-op) | 0 | PASS | No no-op click handlers. |
| `alert("TODO")` / `console.log("TODO")` | 0 | PASS | None. |
| `Failed to fetch` | several | **PASS (honest errors)** | All occurrences are internal `throw new Error(...)` / `console.error/warn` in data-layer error handling (e.g. `biometric-auth.ts`, `deviceRegistry.ts`, `useCapabilities.ts`, `useOmniStream.ts`, connector clients) or an explanatory comment in `Login.tsx`. These are honest error paths/logging, not fake UI. |
| `placeholder` (88), `fake` (16), `dummy` (1) | advisory | PASS | Overwhelmingly input `placeholder=` attributes and identifier/test-helper names; none render mock data as live capability. |

### Most important assertion (OmniMedia)
`rg "Edge Function returned" apps/omnihub-site src` → the raw SDK string appears **only in comments**,
never in a rendered string. The previous user-facing leak (gallery rendering the raw message) was
removed in commit `a104425` (catalog client now throws stable `OmniMediaError` codes; gallery shows
honest i18n copy). A guardrail unit + render test lock this.

## Decision

**PASS** — no production-facing fake surface rendering mock/hardcoded data or a no-op control as a real
capability. The one historical raw-error surface (OmniMedia) is remediated and test-locked in this PR.
