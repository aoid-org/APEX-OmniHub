---
name: apex-frontend
description: End-to-end UI/UX design + frontend engineering + debugging playbook for mobile, web, and desktop. Use when the user asks to design screens/flows, audit usability, build or refactor frontend UI, translate designs to code, create a design system, fix UI/state/layout bugs, improve accessibility, or optimize frontend performance (jank, load time, memory). Trigger phrases include: "design a screen", "wireframe", "prototype", "UI spec", "design system", "component library", "implement this UI", "convert Figma to code", "debug UI bug", "layout broken", "state bug", "animation stutters", "performance/jank", "accessibility audit". Do NOT use for backend-only tasks.
argument-hint: "[design|audit|implement|debug|perf|a11y|system] [platform/stack] [context]"
compatibility: Best in Claude Code (read repo + run scripts). Works in Claude.ai as a structured playbook.
metadata:
  author: APEX Skill Forge
  version: 2.0.0
  category: frontend
  tags: [ui, ux, mobile, web, accessibility, performance, debugging, design-system]
allowed-tools: Read, Grep, Glob, Bash(python *)
---

# APEX Frontend (apex-frontend)

ultrathink

A single operating system for: **UX strategy → UI craft → implementation → debugging → performance → accessibility → design systems** across any platform (React/Next, Vue/Svelte, React Native, Flutter, SwiftUI, Jetpack Compose, Electron, etc.).

## Contract (always execute)
**Input**: $ARGUMENTS (or user request + any provided specs, screenshots, repo context).
**Output**: A shippable plan + artifacts (design + spec + code/fix) + verification checklist results.
**Success**: Task can be executed on first pass with clear acceptance criteria, complete UI states, accessibility pass, and performance budget awareness.

## How to invoke
- `/apex-frontend design ...` → design a flow/screen with spec + states + microcopy + a11y
- `/apex-frontend audit ...` → friction map + prioritized fixes + experiment plan
- `/apex-frontend implement ...` → architecture + components + state model + tests
- `/apex-frontend debug ...` → repro → isolate → root cause → patch → prevention
- `/apex-frontend perf ...` → measure → hot path → fixes → regression guard
- `/apex-frontend a11y ...` → audit + fixes + test procedure
- `/apex-frontend system ...` → tokens + components + governance + adoption plan

If mode is omitted, infer from the request.

## Navigation (pick one path)
1) **Design** → §1
2) **Audit/Redesign** → §2
3) **Implement/Refactor** → §3
4) **Debug** → §4
5) **Performance** → §5
6) **Accessibility** → §6
7) **Design System** → §7

## Non‑negotiables (apply everywhere)
- **Progressive disclosure**: keep core response tight; link to bundled references when deep detail is needed.
- **State completeness**: every screen has `loading | empty | error | partial | success | offline/permission`.
- **Platform reality**: respect navigation/back behavior, safe areas, keyboard, text scaling, localization, and input method.
- **Evidence over vibes** (when auditing/perf): measure, then change.
- **Distinctive craft**: choose an intentional aesthetic direction; avoid generic component‑library sameness.

---

# FAILURE PATTERNS (read before acting)
❌ **No success criteria** → endless iteration, stakeholder churn
❌ **Pretty UI, broken flow** → low task completion
❌ **Missing states** → crashes, confusing blanks, double-submits
❌ **Logic in views** → untestable, fragile UI
❌ **No repro for bugs** → "fixes" that don’t stick
❌ **Perf without profiling** → wasted time
❌ **A11y last** → expensive rework

✅ **Correct pattern**: Contract → Decision path → Produce artifacts → Verify gates → Prevent regressions.

---

# §0 Intake (do this first, then proceed without stalling)
Extract/assume a minimal contract in 60 seconds:

1) **User + job** (who, what outcome)
2) **Platform/stack** (if unknown, assume mobile-first + web-friendly)
3) **Primary success metric** (completion, time, error rate, satisfaction)
4) **Constraints** (brand, performance, a11y, deadlines)
5) **Risks** (unknown APIs, legacy code, device diversity)

If critical info is missing, ask **at most one** question. Otherwise make sane defaults and continue.

Use these templates when helpful:
- UX brief: `assets/templates/ux-brief.md`
- Screen spec: `assets/templates/screen-spec.md`
- Component spec: `assets/templates/component-spec.md`
- Bug report: `assets/templates/bug-report.md`
- Perf budget: `assets/templates/perf-budget.md`

---

# §1 DESIGN (idea → flow → wire → UI spec)
Load references as needed:
- Mobile UX & heuristics: `references/mobile-ux.md`
- Visual craft (distinctive aesthetics): `references/visual-craft.md`
- Motion & micro-interactions: `references/motion.md`
- Interaction patterns library: `references/patterns-library.md`
- Microcopy: `references/microcopy.md`
- Forms & validation: `references/forms.md`
- Platform conventions: `references/platform-conventions.md`
- Responsive web (if applicable): `references/responsive-web.md`
- Accessibility: `references/accessibility.md`

## Execute
1) **Define job stories**
2) **Map the primary flow** (3–7 steps, verbs)
3) **IA + navigation** (where am I / how back / how escape)
4) **Wireframes** (ASCII ok) + **thumb-first layout**
5) **UI spec**: tokens, components, spacing, type, motion
6) **Microcopy**: titles, CTAs, errors, empty states
7) **Edge cases**: interruptions, offline, permissions, rate limits
8) **Verification gates** (below)

## Output format
Provide:
- **Flow map** (bullets or diagram)
- **Wireframes**
- **Component inventory**
- **State table** (loading/empty/error/success/offline/permission)
- **Acceptance criteria** (testable)
- **A11y checklist** (screen reader labels, focus order, contrast, targets)

## Verification gates (must include results)
- Design review critique: `references/design-review.md`
- 5-task usability script (fast): see `references/testing.md`
- A11y: see `references/accessibility.md`
- Platform sanity: see `references/platform-conventions.md`

---

# §2 AUDIT / REDESIGN (evidence → friction map → prioritized fixes)
Load references: `references/audit-playbook.md`

## Execute
1) Gather evidence (any 2): analytics, user feedback, session replays, usability tests
2) Build a **Friction Map** (table): step | intent | friction | severity | hypothesis | fix | metric
3) Prioritize via ICE (Impact/Confidence/Effort)
4) Propose 1–3 redesigns with **measurable hypotheses**
5) Define experiment plan (A/B or pre/post), risks, rollback

---

# §3 IMPLEMENT / REFACTOR (spec → code that stays clean)
Load references:
- Architecture patterns: `references/implementation.md`
- Framework playbooks (React/RN/Flutter/SwiftUI/Compose): `references/framework-playbooks.md`
- Component quality bars: `references/component-quality.md`
- Handoff: `references/handoff.md`
- Testing: `references/testing.md`

## Execute
1) Choose architecture (unidirectional data flow; isolate effects)
2) Define tokens + component boundaries
3) Define state model (reducers/view-model/state machine)
4) Implement components with all states
5) Add tests (unit for state, UI for critical flow)
6) Add instrumentation (analytics + error logging hooks)
7) Run quality gates (below)

## Quality gates (report pass/fail)
- Visual consistency with tokens
- All states implemented
- A11y labels + focus order
- Perf sanity (no obvious re-render storms)
- Regression tests added

Tip (Claude Code): run `python scripts/validate_artifact.py --type screen-spec path/to/spec.md`

---

# §4 DEBUG (repro → isolate → fix → prevent)
Load references: `references/debugging.md`

## Protocol
1) Reproduce (exact steps + environment)
2) Reduce to minimal case
3) Classify: layout | state/race | rendering | data | platform | tooling
4) Instrument boundaries (input→state→render→effect→response)
5) Inspect UI tree + computed values + logs
6) Patch root cause + add regression test
7) Prevent (lint rule, invariant, monitor, or guardrail)

Output must include: **root cause**, **patch plan**, **verification**, **prevention**.

---

# §5 PERFORMANCE (measure → hot path → fix → lock)
Load references: `references/performance.md`

## Protocol
1) Define a perf budget (startup, scroll, memory, network)
2) Profile to find hot path
3) Fix in order: reduce work → reduce overdraw → reduce payload → reduce sync waits
4) Re-measure; add regression guard

---

# §6 ACCESSIBILITY (audit → remediate → verify)
Load references: `references/accessibility.md`

Deliver:
- Issues list (severity)
- Remediation steps
- Verification procedure (screen reader + keyboard + contrast + text scaling)

---

# §7 DESIGN SYSTEM (tokens → components → governance)
Load references: `references/design-system.md`

Deliver:
- Token model (role-based colors, type scale, spacing, radius, elevation, motion)
- Component inventory + states
- Documentation + adoption plan
- Enforcement (lint rules, code mods, CI checks)

---

## Output Scoring (target ≥ 90/100)
Use `references/scorecard.md` to self-score and report the score.

## Examples
See `examples/` for finished outputs you can emulate.
