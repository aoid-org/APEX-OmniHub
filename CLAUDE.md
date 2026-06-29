---
version: 1.2.0
last_audited: 2026-06-28
status: verified
---

# APEX-OMNIHUB / TRADELINE 24/7 CORE PROTOCOLS
- **Modularity:** Maximum file length is 600 lines. Break large files into single-responsibility modules.
- **Architectural Literacy:** Account for state management, race conditions, and concurrent database locks. Do not assume syntax covers architecture.
- **Execution Loop:** One task per session. Test manually. Push to GitHub immediately on pass. Revert immediately on fail. No hallucination cascading.
- **Goal:** Zero Marginal Cost Distribution. "Intelligence Designed."

## Canonical Skill Routing (Updated 2026-06-25)

**Do NOT invoke `apex-dev`.** It is superseded. Use the following skills instead:

| Task | Skill to invoke |
|---|---|
| General APEX development, features, architecture, OmniHub/OmniDash/OmniLink work | `apex-boost-claude` |
| Debugging, bug fixing, error diagnosis, stack traces, failing tests, pre-release audit | `apex-master-debug-claude` |
| Full platform dev/debug/repair/optimization — live Supabase/Cloudflare/edge access | `omnidev-apex-pro-v2` |

All three skills are in `.claude/skills/`. Invoke via the `Skill` tool with the exact skill name above.

## OmniDash Canonical Layout Law (owner-approved 2026-06-29, PR #1516 — DO NOT REGRESS)

The approved OmniDash shell layout is locked and CI-enforced. Before changing
`apps/omnihub-site/dashboard/OmniDashShell.tsx`, read the full record in
`APEX_SURFACE_REGISTRY.md` ("Canonical Layout Law") and
`memory/omni-recall/rfc/2026-06-29-omnidash-p2plus-omnimedia.md`.

- **Static guard:** `npm run check:omnidash` (`scripts/ci/check-omnidash-integrity.mjs`).
- **Runtime shield:** `tests/e2e-playwright/omnidash-real-user.spec.ts`.

Locked invariants: top row (Agent/Slate/Ecosystem) above the fold (OmniSlate
`scrollIntoView` guarded on mount); App Gallery = four horizontal "Awaiting" slots,
no Connect, no Primary Metrics band; `SidebarKpiBar` in the left sidebar footer
(no right-rail `SystemHealthRow`); wallpaper grid + wordmark `position:fixed`;
footer = copyright + Guardian only; language switcher in the header. OmniMedia
`kind ∈ {video,audio,image}`, Files-fed, with **server-side** upload caps (5/24h,
25 MB total). Breaking any invariant fails CI — fix the change, not the guard.

### Canonical dev/debug workflow alias

`omnidev-apex-pro-v2` is the canonical full-platform dev/debug workflow. This matches
`AGENTS.md` frontmatter (`canonical_dev_workflow: omnidev-apex-pro-v2`).

**Alias note:** the skill ships at `.claude/skills/omnidev-apex-pro-v2/` (and a mirror under
`.agents/protocols/omnidev-apex-pro-v2/`), but its `SKILL.md` `name:` field is the historical
`omnidev-apex-pro-native`. Treat `omnidev-apex-pro-v2`, `omnidev-apex-pro-native`, and the
retired `omnidev-apex-pro-1.0.0` as the **same** workflow; always prefer the `v2` identifier.
Do **not** invoke the superseded `apex-dev`.
