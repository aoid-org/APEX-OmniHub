---

version: 2.0.0
last_audited: 2026-06-27
status: active
scope: APEX-OmniHub production repository
owner: APEX Business Systems LTD
canonical_dev_workflow: omnidev-apex-pro-native
-----------------------------------------------

# APEX-OmniHub Repository Instructions

This repository belongs to **APEX Business Systems LTD** and supports **APEX-OmniHub**. Treat it as production-grade software.

APEX-OmniHub is an authenticated, production-facing AI orchestration control plane. Every change must protect reliability, security, premium UX, revenue impact, user trust, and long-term defensibility.

No agent, assistant, or developer may claim completion without evidence.

---

## 1. Current Production Positioning

APEX-OmniHub is under active production remediation for authenticated `/omnidash` reliability, UX, data pipeline, and integration-surface correctness.

Current production certification status:

```text
NO-GO for full authenticated desktop OmniHub user-shoes certification until all active blockers are fixed, validated, and evidenced.
```

Known active remediation domains include:

* OmniDash drag/drop reliability and collision-safe layout.
* OmniBoard third-party integration gateway/session behavior.
* APEX Apps first-party MCP ecosystem routing.
* Integrated Apps / Connections semantic cleanup.
* OmniMedia upload-fed catalog, gallery, and playback pipeline.
* Files-to-OmniMedia ingestion.
* Modal system accessibility and dismissal behavior.
* Visible OmniDash language switcher.
* E2E false-positive hardening.
* All-viewport responsive validation.
* Repo documentation and canonical truth alignment.

No PR may claim full OmniHub certification unless all acceptance gates pass with attached evidence.

---

## 2. Product Standard

Every change must support enterprise-grade quality:

* Reliability
* Security
* Scalability
* Maintainability
* Modularity
* Performance
* Observability
* Testability
* Simplicity
* Premium UX
* Accessibility
* Responsiveness
* Regression safety
* Operational clarity
* Rollback safety

Optimize for:

* User value
* Revenue impact
* Conversion
* Retention
* Trust
* Automation
* Operational efficiency
* Long-term defensibility

Do not ship fake functionality, mock-only production behavior, misleading empty states, or UI that implies a backend capability exists when it does not.

---

## 3. Sole Development Workflow

Use **omnidev-apex-pro-native** as the canonical dev/debug workflow for APEX-OmniHub work.

Legacy or adjacent workflows may be read as context only unless explicitly reconciled into the current canonical contract.

Active workflow priority:

1. Current execution contract supplied by APEX leadership.
2. `memory/omni-recall/docs/architecture/CANONICAL_TRUTH.md`
3. This `AGENTS.md`
4. `CLAUDE.md`
5. `omnidev-apex-pro-native`
6. Other legacy skills/docs as read-only references.

If instructions conflict, do not guess. Follow the highest-priority current source and document the conflict.

---

## 4. Tree Law — Live Repo Targeting

The live OmniHub app renders from:

```text
apps/omnihub-site/
```

The live OmniDash production surface renders from:

```text
apps/omnihub-site/dashboard/
```

Canonical live paths:

```text
apps/omnihub-site/dashboard/OmniDashShell.tsx
apps/omnihub-site/dashboard/DraggableWidget.tsx
apps/omnihub-site/dashboard/components/
apps/omnihub-site/dashboard/components/modules/
apps/omnihub-site/dashboard/components/media/
apps/omnihub-site/src/
supabase/functions/
supabase/migrations/
tests/e2e-playwright/
```

Do **not** target this path for OmniDash production remediation unless a current import trace proves it is live:

```text
src/components/dashboard/
```

Known rule:

```text
If a task targets OmniDash and proposes edits under src/components/dashboard/, STOP and re-resolve the live rendered path under apps/omnihub-site/dashboard/.
```

Editing ghost paths is an automatic NO-GO.

---

## 5. Required Pre-Work

Before modifying code, inspect the repo for context.

Always search for:

1. Existing implementations.
2. Similar components, services, hooks, utilities, stores, and modules.
3. Reusable abstractions.
4. Existing tests.
5. Existing docs and config.
6. Existing migrations and Edge Functions.
7. Existing feature flags.
8. Existing error handling.
9. Existing accessibility patterns.
10. `memory/omni-recall/` or `omni-recall/`, if present.

Use `memory/omni-recall` for:

* Prior decisions.
* Known constraints.
* Canonical truth.
* Architecture notes.
* Debugging history.
* Production incidents.
* Remediation baselines.
* Accepted findings.

Do not make surface-level assumptions when repo context exists.

Every factual claim about the repo must be backed by a verified path, line, command output, or explicitly marked:

```text
UNCERTAIN:[gap]
```

---

## 6. Documentation-First Canon Gate

Before committing implementation changes that alter architecture, ownership, routing, data flow, or production behavior, update relevant repo documentation to current truth.

Check and update where present:

```text
memory/omni-recall/production-path-registry.md
memory/omni-recall/production-surface-remediation-baseline.md
memory/omni-recall/docs/architecture/CANONICAL_TRUTH.md
AGENTS.md
CLAUDE.md
```

Docs must stay aligned with code.

If a canonical doc still points agents to stale paths, stale ownership, or stale behavior, fix the doc before or in the same patch group as the implementation.

No code may intentionally ship while the repo canon still contradicts the implementation.

---

## 7. Canonical Surface Ownership

APEX-OmniHub integration ownership has **two distinct owners**.

### OmniBoard

OmniBoard owns **third-party provider / SaaS integration only**.

Examples:

* Salesforce
* Slack
* GitHub
* Stripe
* Google Workspace
* Notion
* HubSpot
* Other external APIs

OmniBoard owns:

```text
third_party_provider_connections
connector_sessions
connection_specs
provider identification
provider authorization handoff
gateway unavailable states
```

OmniBoard does **not** own:

```text
first-party APEX ecosystem apps
MCP ecosystem app installation
media upload
media playback
general Files upload
language settings
```

### APEX Apps / APEX Ecosystem

APEX Apps owns **first-party APEX ecosystem app connection over MCP**.

APEX Apps owns:

```text
internal_apex_app_registry
mcp_app_connection_flow
apex_app_install_state
first_party_app_permissions
```

APEX Apps does **not** own:

```text
third-party SaaS provider connection
external connector sessions unless explicitly defined
OmniMedia ingestion
Files upload
```

Required routing:

```text
Add APEX App -> apex-apps-mcp
Connect Third-Party App -> OmniBoard
```

Forbidden routing:

```text
Add APEX App -> OmniBoard
```

### Files

Files owns:

```text
file_upload
file_management
general storage
```

Files may feed OmniMedia when an uploaded file is playable media.

### OmniMedia

OmniMedia owns:

```text
media_catalog
media_gallery
media_playback
media_ingestion
uploaded media metadata
```

OmniMedia must not rely on hardcoded demo-only media as the production source.

### Language

Language owns:

```text
locale_selection
locale_persistence
visible OmniDash language switching
```

The language switcher must be visible on the OmniDash surface, not buried in an obscure flow.

---

## 8. Modal Law

`OmniSpatialHost` owns modal chrome.

Ordinary modals must have:

* One modal shell.
* One visible close button.
* One accessible title.
* `role="dialog"`.
* `aria-modal="true"`.
* Focus trap.
* Focus return to opener.
* Escape closes.
* Backdrop click closes.
* No duplicate inner modal chrome.
* No raw transport errors shown to users.

Child modules render content only.

Forbidden:

* Nested modal shells.
* Duplicate close buttons.
* Backdrop click minimizing ordinary modals.
* Fake success states.
* Raw backend errors dumped into the UI.

If minimize remains available, it must be an explicit visible button, not hidden behind outside-click behavior.

---

## 9. Honest Gateway Law

OmniBoard may depend on the `ORCHESTRATOR_URL` Edge Function environment variable and external orchestrator availability.

If the gateway is unavailable, the UI must say so honestly.

Classify failures accurately:

```text
BLOCKED-CONFIG — ORCHESTRATOR_URL missing
BLOCKED-INFRA — ORCHESTRATOR_URL exists but service unreachable/non-2xx
CODE BUG — edge route misroutes despite reachable orchestrator
FRONTEND UX BUG — UI shows raw/misleading error despite valid backend response
```

OmniBoard must never:

* Fake OAuth success.
* Fake third-party connection success.
* Insert fake connector sessions.
* Mark an app connected without verified connection data.
* Hide unavailable systems behind polished UI.

If an inline HMAC FSM fallback exists, it must be behind:

```text
OMNIBOARD_INLINE_FSM_FALLBACK
```

and must use a dedicated secret:

```text
OMNIBOARD_SESSION_SECRET
```

Do not silently reuse JWT secrets for unrelated signing.

---

## 10. OmniMedia Pipeline Law

OmniMedia must use a real media pipeline.

Production OmniMedia must not depend on:

```text
DEMO_CLIPS
Big Buck Bunny
Elephants Dream
hardcoded two-item arrays
YouTube-only playback
```

Required production model:

```text
Files upload UX
  -> classify MIME type
  -> general file goes to omnihub-files
  -> playable media goes to omnimedia-assets
  -> omnimedia_assets row is created
  -> omnimedia-catalog returns item
  -> signed URL is generated
  -> OmniMedia widget and modal gallery show item
  -> video/audio actually plays
```

OmniMedia requires:

* Real catalog endpoint.
* Real upload-fed gallery.
* First-party media playback.
* Signed playback URLs for private storage.
* Honest unsupported/error states.
* Gallery in both widget and modal surfaces.
* External embed fallback copy.

YouTube support is compatibility only. YouTube embed visibility is not playback certification.

---

## 11. Drag/Drop Law

Desktop widget drag must be deterministic and intuitive.

Required behavior:

```text
pointerdown
setPointerCapture(pointerId)
pointermove updates candidate position in same gesture
snap to grid
resolve collision
clamp to canvas
pointerup persists valid layout
```

Forbidden desktop behavior:

* Release/re-click required before dragging.
* Framer Motion `drag` toggled after pointerdown as gesture owner.
* Widgets dropped outside valid canvas.
* Widgets overlapping after drop.
* Raw viewport-only offsets without breakpoint-aware layout.
* Persisting invalid layout.

Layout must be stored by:

```text
widgetId
breakpoint
layoutVersion
```

Use versioned storage such as:

```text
omnidash_layout_v2:{userId}:{breakpoint}
```

Touch long-press may remain only for touch and must not degrade desktop mouse behavior.

---

## 12. Responsive Mandate

Every new or changed surface must work across:

* Desktop
* Tablet
* Mobile

Use the existing viewport system where present.

Requirements:

* Use `useViewport()` or extend it safely.
* Avoid hardcoded breakpoints where tokens/hooks exist.
* Use fluid layout patterns.
* Use CSS grid `auto-fit` / `minmax` for galleries and grids.
* Use mobile full-height sheets where desktop uses centered panels.
* Maintain touch targets of at least 44px.
* Validate desktop and mobile at minimum in E2E.
* Tablet validation is preferred where practical.

A surface that only passes desktop is not complete.

---

## 13. Architecture Priority

When implementing, prioritize in this order:

1. Current canonical docs.
2. Existing architecture.
3. Existing patterns.
4. Existing abstractions.
5. Small extension of current behavior.
6. New implementation only when justified.

Do not introduce new architectural patterns unless clearly necessary.

Prefer:

* Surgical additions.
* Small composable modules.
* Shared components when two surfaces need the same behavior.
* Additive migrations.
* Feature flags for risky behavior.
* Backward-compatible rollouts.

Avoid:

* Broad rewrites.
* Duplicate logic.
* Hidden coupling.
* Premature complexity.
* Untested behavior changes.
* Breaking public APIs.
* Unnecessary dependencies.
* Formatting churn outside touched code.

---

## 14. Change Rules

All changes must be:

* Atomic
* Surgical
* Minimal-diff
* Idempotent where relevant
* Reversible
* Testable
* Regression-safe
* Blast-radius contained
* Evidence-backed

Each meaningful phase must have:

* Purpose
* Files touched
* Risk
* Rollback path
* Validation

Separate commits or clearly separable patch groups are required for high-risk remediation phases.

---

## 15. Security & Data Rules

Treat these as high-risk:

* Auth
* Permissions
* Tenant scoping
* RLS
* Storage policies
* Payments
* Customer data
* Secrets
* Business logic
* Integrations
* Edge Functions
* Migrations
* Media access URLs

Never:

* Expose `service_role` in client code.
* Expose HMAC/JWT/database secrets in browser code.
* Weaken access controls.
* Disable RLS without explicit written approval.
* Authorize on user-editable metadata.
* Log sensitive data.
* Create destructive migrations without explicit approval.
* Ship a new public table without RLS and policies in the same migration.

Supabase rules:

* New public tables must enable RLS.
* New storage buckets must include access policies.
* Owner/tenant scoping must be explicit.
* Private media must use signed URLs or intentional authenticated access.
* Migrations should be additive unless explicitly approved otherwise.

---

## 16. UX Standard

For frontend work, prioritize:

* Clarity
* Speed
* Accessibility
* Responsiveness
* Low-friction flows
* Honest error states
* Loading states
* Empty states
* Consistent visual hierarchy
* Premium interaction design
* Keyboard accessibility
* Screen-reader support
* Predictable controls
* Clear ownership between surfaces

Do not degrade existing UX.

Do not hide broken systems behind prettier UI.

If a system is unavailable, gate it honestly and make retry behavior real.

---

## 17. Debugging Rules

Use a root-cause workflow:

1. Identify expected behavior.
2. Identify actual behavior.
3. Trace the failing path.
4. Confirm root cause with evidence.
5. Apply the smallest safe fix.
6. Add regression coverage.
7. Validate.
8. Document result.

Do not patch symptoms without understanding cause.

Attempt ceiling:

```text
3 focused attempts, then stop and report UNCERTAIN:[gap].
```

Do not keep retrying the same failed fix.

---

## 18. Testing & Validation

Use existing repo commands whenever possible.

Before inventing commands, inspect:

* `package.json`
* lockfiles
* CI config
* docs
* task runners
* Playwright config
* Supabase config
* scripts

Run the most relevant validation:

* Typecheck
* Lint
* Unit tests
* Integration tests
* E2E tests
* Build
* Security checks
* Secret scan
* Supabase migration validation
* Supabase function validation
* Targeted manual verification

If validation cannot be run, state exactly why and what should be run next.

---

## 19. E2E Truth Standard

Tests must prove behavior, not visibility.

Weak assertions are not enough:

```text
button visible
modal visible
iframe visible
section visible
```

Required behavior assertions include:

* Drag moves in one continuous gesture.
* Widgets remain bounded and collision-safe.
* Modal has one close button.
* Backdrop and Escape close ordinary modals.
* APEX Apps does not open OmniBoard.
* Connections are split semantically.
* OmniBoard starts or honestly gates a session.
* OmniBoard never fakes success.
* Files upload can feed OmniMedia.
* OmniMedia catalog is called.
* First-party media appears in widget and modal gallery.
* First-party video/audio actually plays.
* `readyState >= 2`.
* `currentTime` advances.
* `media.error === null`.
* YouTube Error 153 cannot pass.
* Language switcher is visible and persistent.
* Mobile viewport passes for changed surfaces.

---

## 20. Evidence Requirements

No narrative-only completion is accepted.

Every claimed fix must include:

```text
Resolution proof
Engine proof
Completion proof
Failure-state proof
```

Meaning:

* Resolution proof: the bug no longer reproduces.
* Engine proof: the underlying route, state, data path, or backend contract works.
* Completion proof: the user-visible behavior works.
* Failure-state proof: dependency failures fail honestly.

Expected evidence may include:

* Bash output.
* Test output.
* Playwright HTML report.
* Trace zip.
* Screenshots.
* Network traces.
* Supabase migration output.
* Edge Function probe output.
* Before/after notes.
* Rollback flags.

Do not claim a command passed if it was not run.

---

## 21. Feature Flags & Rollback

Use feature flags for risky changes where appropriate.

Known remediation flags may include:

```text
VITE_OMNIDASH_POINTER_DRAG_V2
VITE_OMNIDASH_SURFACE_OWNERSHIP_V2
VITE_OMNIMEDIA_CATALOG_V1
VITE_OMNIDASH_LANGUAGE_SWITCHER
OMNIBOARD_INLINE_FSM_FALLBACK
```

Staging may enable flags first.

Production should keep risky flags off until staging smoke passes.

Rollback should prefer:

1. Disable feature flag.
2. Revert phase commit.
3. Redeploy prior frontend/Edge bundle.
4. Non-destructive DB status rollback.
5. Destructive rollback only with explicit approval and no production data risk.

Never automatically delete user-uploaded storage objects during rollback.

---

## 22. Required Deliverable Format

When finishing a task, respond with:

1. Decision: `GO`, `NO-GO`, or `BLOCKED`
2. What changed
3. Why it changed
4. Files touched
5. Validation performed
6. Evidence artifacts
7. Risks / limitations / follow-ups
8. Rollback path
9. Final certification language, if relevant

For production remediation, use:

```text
VERIFIED:
HEALTH:
TESTS:
EVIDENCE:
POSTMORTEM:
NEXT:
```

Keep responses concise, specific, and actionable.

---

## 23. Allowed Certification Language

Use only evidence-backed certification language.

If every gate passes:

```text
GO for authenticated desktop OmniHub user-shoes validation.
```

If only Links/APEX-2011 passes:

```text
GO for APEX-2011 Links fallback only. Full OmniHub certification remains blocked.
```

If wrong-tree edits are detected:

```text
NO-GO. This PR edited non-rendered OmniDash paths and did not remediate the live production dashboard tree.
```

If repo docs are stale:

```text
NO-GO. Repo documentation and canonical truth still point agents toward stale or contradictory implementation paths.
```

If OmniMedia lacks first-party playback:

```text
NO-GO. OmniMedia does not have a certifiable first-party upload-fed playback pipeline.
```

If OmniBoard only shows unavailable:

```text
NO-GO for production OmniBoard functionality. Honest unavailable gating is acceptable UX, but not full functional certification.
```

If APEX Apps still opens OmniBoard:

```text
NO-GO. Canonical surface routing is still broken.
```

If Integrated Apps still runs a parallel picker:

```text
NO-GO. Integrated Apps still violates canonical ownership and duplicates connection routing.
```

If language switcher is missing:

```text
NO-GO for complete OmniDash UX surface certification.
```

If responsive coverage fails:

```text
NO-GO. One or more changed OmniDash surfaces fail required mobile/desktop viewport validation.
```

---

## 24. APEX Workflow Frameworks

Use the right workflow silently unless the task benefits from explaining it.

Current active workflow:

* `omnidev-apex-pro-v2` for APEX-OmniHub implementation, debugging, validation, and production remediation.

Read-only/contextual frameworks when relevant:

* `apex-master-debug` for root-cause debugging.
* `universal-apex-debug` for systematic diagnosis.
* `omnitest` for UI/app validation.
* `apex-frontend` for premium UX implementation.
* `gtm-omni` for growth, funnel, positioning, and revenue work.

Do not let older workflow docs override current Tree Law, surface ownership canon, Modal Law, Honest Gateway Law, OmniMedia Pipeline Law, or Responsive Mandate.

---

## 25. Final Operating Principle

First make the repo tell the truth.

Then make the code obey that truth.

Then make the tests prove the truth.

Then make the release gates enforce the truth.

No unverified claim is a fact.

No visible component passes unless its data path works.

No production certification is earned without evidence.


