---
name: apex-frontend
description: "Ultimate UI/UX + frontend engineering + debugging OS for mobile, web, and desktop. Use for design, audit, implement, debug, performance, accessibility, design systems, and migrations."
license: "Proprietary - APEX Business Systems Ltd. Edmonton, AB, Canada. https://apexbusiness-systems.com"
---

# APEX-FRONTEND

**Mission**: Produce shippable, accessible, performant interfaces with deterministic design→build→debug loops across any platform and language.

## CONTRACT (Always enforce)

**Input**: one of {idea | screenshots | Figma/spec | repo/task | bug report | perf issue | a11y issue | design system request}.  
**Output**: deliverables appropriate to mode + **Verification Package** (UX/A11y/Perf/Quality).  
**Success**: measurable gates met; no critical gaps in states; regression prevented.

## MODE ROUTER (Start here)

Interpret `$ARGUMENTS` to select a mode. If mode is not explicit, infer from intent.

**Modes** (first word in arguments):
- `design`  → new flow/screen design
- `audit`   → UX teardown + prioritized fixes
- `implement` → component/screen implementation plan + architecture + tests
- `debug`   → root-cause + patch + prevention
- `perf`    → measure → hot path → fix → re-measure
- `a11y`    → accessibility audit + fixes
- `system`  → tokens + components + governance
- `migrate` → framework/platform migration plan

If multiple apply, pick the highest-leverage order:
`debug/perf/a11y` (stability) → `audit` (friction) → `design/implement/system` (build).

## OUTPUT FORMAT (Non-negotiable)

Return exactly these sections:

1) **Mode + Assumptions**
2) **Failure Patterns (❌)**
3) **Plan (steps with deliverables)**
4) **Executable Artifacts** (tables/specs/checklists/code/pseudocode)
5) **Verification Package**
   - UX gate
   - A11y gate
   - State gate
   - Perf gate
   - Ship gate
6) **Next Actions (minimum 3)**

## GLOBAL GATES (Always apply)

### State completeness
Every screen/component must define: `loading | empty | error | success | disabled | offline/timeout | permission-denied (if relevant)`.

### Mobile UX
- Primary actions reachable (thumb-first), targets ≥ 44×44, clear back navigation, immediate feedback.

### Accessibility
- Roles/labels, focus order, contrast, text scaling, no color-only meaning.

### Performance
- Define budgets; measure before optimizing; fix hot path; re-measure; add regression guard.

### Quality
- Separate view from state/business logic; add at least one regression test for critical behavior.

## SUPPORTING FILES (Load when needed)

**Playbooks**
- Design: [references/design-playbook.md](references/design-playbook.md)
- Audit: [references/audit-playbook.md](references/audit-playbook.md)
- Implementation: [references/implementation-playbook.md](references/implementation-playbook.md)
- Debugging: [references/debugging-playbook.md](references/debugging-playbook.md)
- Performance: [references/performance-playbook.md](references/performance-playbook.md)
- Accessibility: [references/accessibility-playbook.md](references/accessibility-playbook.md)
- Design System: [references/design-system-playbook.md](references/design-system-playbook.md)
- Migration: [references/migration-playbook.md](references/migration-playbook.md)

**Templates**
- UX brief: [templates/ux-brief.md](templates/ux-brief.md)
- Screen spec: [templates/screen-spec.md](templates/screen-spec.md)
- Component spec: [templates/component-spec.md](templates/component-spec.md)
- Bug triage: [templates/bug-triage.md](templates/bug-triage.md)
- Perf budget: [templates/perf-budget.md](templates/perf-budget.md)
- A11y audit: [templates/a11y-audit.md](templates/a11y-audit.md)
- Design system: [templates/design-system.md](templates/design-system.md)

**Examples**
- Design: [examples/design-example.md](examples/design-example.md)
- Debug: [examples/debug-example.md](examples/debug-example.md)
- Perf: [examples/perf-example.md](examples/perf-example.md)
- A11y: [examples/a11y-example.md](examples/a11y-example.md)

**Optional validator (Claude Code)**
- `scripts/validate_artifact.py` validates a markdown output against required sections.
