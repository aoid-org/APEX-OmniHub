---
name: apex-frontend
description: Portable UI/UX + frontend engineering + debugging operating system. Use when designing screens/flows, auditing usability, implementing frontend UI, creating design systems, fixing UI/state/layout bugs, improving accessibility, or optimizing frontend performance across web/mobile/desktop stacks.
license: MIT
compatibility: Agent Skills standard. If your platform cannot install skills, use prompts in /prompts as system+user instructions.
metadata:
  author: APEX Skill Forge
  version: 2.0.0
  category: frontend
  tags: [ui, ux, frontend, mobile, web, accessibility, performance, debugging, design-system]
---

# APEX Frontend (Universal)

This package is the **model-agnostic** version of apex-frontend.

## Install options
1) **Agent Skills platforms**: install this folder as a skill named `apex-frontend`.
2) **Any model (no skills support)**:
   - Paste `prompts/system-prompt.md` into the system/developer instructions.
   - Use `prompts/user-starter.md` as the user prompt template.
   - Use `prompts/scorecard.md` to self-critique before final answers.

## Invocation
If your platform supports slash-commands, use:
`/apex-frontend [design|audit|implement|debug|perf|a11y|system] ...`

Otherwise, start your request with:
`MODE: design` (or audit/implement/debug/perf/a11y/system)

## Core Contract
**Input**: requirements, constraints, platform/stack, and any artifacts (screenshots/specs/code).  
**Output**: plan + artifacts + verification gates.  
**Success**: complete states, accessibility pass, performance awareness, and regression prevention.

## Navigation
- DESIGN → use `references/design.md` + `references/visual-craft.md` + `references/motion.md` + `references/patterns.md`
- AUDIT → use `references/audit.md`
- IMPLEMENT → use `references/implement.md` + `references/framework-playbooks.md`
- DEBUG → use `references/debug.md`
- PERF → use `references/perf.md`
- A11Y → use `references/a11y.md`
- SYSTEM → use `references/system.md`

## Non‑negotiables
- Run a quick design review: `references/design-review.md`
- State completeness: loading/empty/error/partial/success/offline/permission
- Platform conventions respected
- Evidence before change (audit/perf)
- Output must include acceptance criteria and a verification checklist
