# APEX-OmniHub Repository Instructions

This repository belongs to APEX Business Systems LTD and supports APEX-OmniHub. Treat it as production-grade software.

## Product Standard

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
* Regression safety

Optimize for revenue impact, user value, operational efficiency, automation, and long-term defensibility.

## Required Pre-Work

Before modifying code, inspect the repo for context.

Always search for:

1. Existing implementations
2. Similar components/services/hooks/utilities
3. Reusable abstractions
4. Existing tests
5. Existing docs/config
6. An `omni-recall` directory, if present

Use `omni-recall` for prior decisions, known constraints, architectural notes, debugging history, and project context. Do not make surface-level assumptions when repo context exists.

## Architecture Priority

When implementing, prioritize in this order:

1. Existing architecture
2. Existing patterns
3. Existing abstractions
4. Small extension of current behavior
5. New implementation only when justified

Do not introduce new architectural patterns unless clearly necessary.

## Change Rules

All changes must be:

* Atomic
* Surgical
* Minimal-diff
* Idempotent where relevant
* Reversible
* Testable
* Regression-safe
* Blast-radius contained

Avoid:

* Broad rewrites
* Duplicate logic
* Hidden coupling
* Premature complexity
* Untested behavior changes
* Breaking public APIs
* Unnecessary dependency additions
* Formatting churn outside touched code

## UX Standard

For frontend work, prioritize:

* Clarity
* Speed
* Accessibility
* Responsiveness
* Low-friction flows
* Error states
* Loading states
* Empty states
* Consistent visual hierarchy
* Premium, polished interaction design

Do not degrade existing UX.

## Security & Data Rules

Treat auth, permissions, payments, customer data, secrets, business logic, and integrations as high-risk.

Never expose secrets, weaken access controls, bypass validation, or log sensitive data.

For risky areas, explain the risk and choose the safest minimal change.

## Debugging Rules

Use a root-cause workflow:

1. Identify expected behavior.
2. Identify actual behavior.
3. Trace the failing path.
4. Confirm root cause with evidence.
5. Apply the smallest safe fix.
6. Add regression coverage when appropriate.
7. Validate.

Do not patch symptoms without understanding cause.

## Testing & Validation

Use existing repo commands whenever possible. Inspect scripts, CI, docs, package managers, task runners, and config before inventing commands.

After changes, run the most relevant validation available:

* Typecheck
* Lint
* Unit tests
* Integration tests
* Build
* Targeted manual verification

If validation cannot be run, state exactly why and what should be run next.

## Deliverable Format

When finishing a task, respond with:

1. What changed
2. Why it changed
3. Files touched
4. Validation performed
5. Risks, limitations, or follow-ups

Keep responses concise and actionable.

## APEX Workflow Frameworks

Apply these workflows when relevant:

* apex-dev for production implementation
* one-pass-debug for root-cause debugging
* gtm-omni for growth, funnel, positioning, and revenue work
* UNIVERSAL_DEBUG_SKILL for systematic diagnosis
* webapp-testing for UI/app validation
* frontend-design for premium UX implementation

Use the right workflow silently unless the task benefits from explaining it.

