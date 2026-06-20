---
name: apex-user-shoes-validation
description: apply a repeatable user-shoes validation gate for product surfaces, widgets, modals, agent flows, dashboards, and production rescue work. use when asked to audit, certify, harden, rescue, validate, test like a user, preserve visual quality, prevent product drift, create go/no-go reports, or ensure each ui surface has a functioning, relevant, logical purpose. especially use for apex-omnihub, omnidash, omniboard, links, omnislate, module actions, modal behavior, unsupported states, and visual-preservation reviews.
---

# Apex User Shoes Validation

## Operating Standard

Validate products as a real user, not as a compiler. A surface passes only when a first-time user can understand what it is for, what action to take, what happened, and why any blocked action is blocked.

Never trade product clarity or visual quality for code reduction. Streamline backend logic, contracts, routing, error handling, and tests; do not flatten premium UI or erase module-specific visual meaning.

## Load References

Load only what is needed:
- `references/apex-canonical-truth.md` when working on APEX-OmniHub, OmniDash, OmniBoard, Links, OmniSlate, or module widgets.
- `references/validation-rubric.md` when making GO / NO-GO / BLOCKED decisions.
- `references/report-templates.md` when producing audit reports, PR handoff prompts, or evidence matrices.

Use `scripts/create_validation_pack.py` when a task needs a repeatable evidence folder with markdown templates.

## Workflow

### 1. Establish product truth

Before changing or certifying anything, identify the canonical purpose of the surface.

For each widget, modal, page, or agent flow, answer:
1. What does this surface claim to do?
2. What would a user expect after clicking the primary entry point?
3. What is the real product job?
4. What systems, integrations, or prerequisites are required?
5. What should happen if those systems are missing?

If docs, tests, code, and runtime behavior disagree, declare drift before proposing fixes.

### 2. Test in the user's shoes

For every visible surface:
- open it from the same entry point a user would use;
- read the labels and copy as if seeing them for the first time;
- click primary and secondary actions;
- record whether each action works, is honestly gated, or fails;
- check whether the visual design feels unified with the rest of the product;
- capture screenshots and sanitized network summaries when browser validation is available.

A modal that renders but does not serve a logical user purpose is NO-GO.

### 3. Preserve visual quality

Reject visual edits that:
- make the UI flatter or more generic;
- remove useful module-specific context;
- break the product's visual language;
- replace a meaningful custom surface with a bare generic shell;
- hide broken functionality behind cleaner layout.

Approve visual edits only when before/after screenshots prove the result is visually equal or better and functionally clearer.

### 4. Harden action behavior

Every visible action must be one of:
- working and verified;
- locally handled and verified;
- disabled/gated with honest copy;
- explicitly unavailable because a prerequisite is missing.

Unsupported actions must not fire broken backend calls that produce generic 500 errors. Do not allow raw backend IDs, fake success, silent no-ops, or misleading labels.

### 5. Produce a decision

Use GO only when user-shoes validation, tests, and evidence pass. Use NO-GO when the surface is misleading, broken, visually degraded, or untestable. Use BLOCKED only when a required external condition prevents validation, and state the exact blocker and next action.

## Evidence Rules

When browser validation is available, collect:
- before screenshot;
- opened modal/surface screenshot;
- post-action screenshot;
- sanitized network endpoint and body fields only;
- visible user result;
- exact defect bucket.

Never include secrets, cookies, JWTs, bearer tokens, localStorage auth values, service-role keys, raw auth headers, database URLs, or private credentials.

## Output Rules

Be direct. Lead with the decision. Separate:
- confirmed facts;
- observed runtime behavior;
- source-code evidence;
- assumptions;
- blockers;
- next executable actions.

When writing handoff prompts for implementation agents, include:
- mission;
- non-negotiables;
- files to inspect;
- exact behavior to implement;
- tests to add;
- validation commands;
- browser evidence requirements;
- GO / NO-GO rules.
