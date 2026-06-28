# OmniDash P1 Conflict Risk Note — BLOCKED

Date: 2026-06-28
Branch: work
Current HEAD: 525191d327e2c0240ace332a011fa65e7a8f165f

## Decision

BLOCKED. P1 implementation did not start.

## Required P0 dependency

The Codex Execution Contract requires P1 work to start only after Claude's P0 branch is merged, staged, or explicitly provided as the base. The required P0 ownership areas are:

- navigation controller;
- responsive surface router;
- bottom-nav behavior;
- active-state model;
- tablet/mobile surface access paths;
- backend P0 owner-gating.

## Observed repository base

Current branch is `work` at `525191d327e2c0240ace332a011fa65e7a8f165f`.
Recent history shows:

- `525191d` — A11y drawer/module-key test hardening;
- `51b9e28` — OmniSkin extraction/responsive repair after-evidence;
- `1111caa` — post-1510 UI/UX remediation.

No explicit Claude P0 branch/commit was supplied in the prompt, and no merge commit in the inspected history identifies the required P0 navigation/responsive owner-gating branch as the P1 base.

## Why implementation is unsafe now

P1 changes target modal dismissal, duplicate close controls, widget controls, demo-mode gating, Billing error honesty, Workflows unavailable actions, and OmniMedia eager-fetch behavior. Several of those areas depend on the final P0 shell/router/surface mounting shape. Implementing now could conflict with or duplicate Claude's P0 work, especially around:

- `OmniSpatialHost.tsx` modal layering and dismissal;
- `OmniDashShell.tsx` responsive surface mounting and `ops.demo` data path;
- widget reachability and `DraggableWidget.tsx` controls;
- tablet/mobile access paths for validating controls and modals.

## Smallest safe action taken

Inspection-only preflight was performed. No P1 production implementation was started.

## Minimum condition to proceed

Provide or merge Claude's P0 branch/commit, then start a P1 branch from that exact base, for example:

```bash
git checkout main
git pull
git checkout -b codex/omnidash-p1-stabilization
```

or explicitly state that current branch `work` at `525191d327e2c0240ace332a011fa65e7a8f165f` is the approved P0-safe base.

## Risk if ignored

High. P1 modal/widget/demo-mode changes could be overwritten by, conflict with, or incorrectly validate against pre-P0 shell behavior.
