---
description: Omnidash contract enforcement — mandatory preamble and process for all Omnidash PRs
---

# Omnidash Contract Workflow (Lock 6)

Every agent prompt targeting Omnidash must comply with this workflow.

## 1. Paste the Preamble

Before any Omnidash work, paste this preamble **verbatim** at the top of your prompt:

> "You may not invent, remove, rename, reroute, or restatus Omnidash apps
> outside omnidash.contract.ts. Write failing tests first. One logical
> change only. If blast radius exceeds 5 files, stop and report
> architecture change."

## 2. Write Failing Test First

Before making any code change, write a failing test that proves the current behavior is wrong.

## 3. Make the Change

One logical change per commit. Never bundle unrelated changes.

## 4. Run Contract Tests

// turbo

```bash
pnpm vitest run tests/core/app-registry.spec.ts tests/omnidash/dashboard-overview-wiring.test.tsx tests/omnidash/omnidash-widgets.chaos.spec.tsx tests/omnidash/omnidash-layout-contract.spec.tsx tests/omnidash/omnidash-canvas-contract.spec.tsx tests/omnidash/z-index-manager.spec.ts tests/omnidash/omnidash-css-contract.spec.ts
```

## 5. Run Quality Gates

// turbo

```bash
pnpm eslint .
pnpm tsc --noEmit
```

## 6. Run Blast-Radius Check

// turbo

```bash
npx tsx scripts/omnidash-blast-radius.ts
```

If blast radius > 5 files: **STOP**. Output:

```
BLOCKED: Architecture change detected.
Surfaces affected: [list].
Awaiting escalation.
```

## 7. Request Review

All Omnidash-touching PRs require CODEOWNERS sign-off + green contract tests before merge.

## Failure Protocol

- If contract tests fail → **STOP**. Do not attempt fixes without a failing test first.
- If a required contract field is absent → **STOP**. Output: `UNCERTAIN: [field] missing.`
- If blast radius exceeds 5 files → **STOP**. Classify as architecture change.
- Never proceed on assumption. Never guess at registry state.
