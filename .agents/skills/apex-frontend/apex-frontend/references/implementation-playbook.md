# Implementation Playbook

## Failures (❌)
- Pixel-perfect without system → unmaintainable.
- Business logic in UI → state bugs.

## Correct Pattern (✅)
Tokens → Components → State model → Screens → Tests.

## Universal component spec
Props, states, a11y semantics, motion, QA checklist.

## Architecture defaults
- Single source of truth for state (store/viewmodel/state machine).
- Effects layer for IO.
- UI is a pure function of state.
