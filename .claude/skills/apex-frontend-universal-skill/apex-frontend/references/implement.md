# IMPLEMENT Protocol (Universal)

## Architecture default
Tokens → Components → State model → Screens → Effects

## State model rules
- One source of truth
- Unidirectional flow (events → state → UI)
- Cancel stale async work
- Avoid boolean soup; prefer explicit enums

## Build checklist
- Components implement all states
- Accessibility labels + focus behavior
- Tests: unit for state logic, UI/E2E for critical flow
- Instrumentation for key events and errors
