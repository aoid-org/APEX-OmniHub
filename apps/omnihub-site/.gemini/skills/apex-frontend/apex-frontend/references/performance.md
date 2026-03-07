# Performance Playbook (frontend)

## Measure first (always)
Define your budget:
- Startup/TTI
- Scroll smoothness / frame drops
- Memory ceiling
- Network payload size

## Common bottlenecks and fixes
### 1) Too much render work
- Memoize expensive components
- Use virtualization for lists
- Avoid re-render storms (stable props, selectors)
- Split bundles / lazy load routes

### 2) Layout thrash / reflow
- Avoid measuring DOM in loops
- Batch reads/writes
- Prefer transform/opacity animations

### 3) Images
- Resize to display size
- Use modern formats where possible
- Cache aggressively
- Avoid decoding huge images on main thread

### 4) Overdraw and heavy effects
- Limit blurs, shadows, filters
- Reduce layered translucency
- Prefer subtle motion with fewer layers

### 5) Network + state
- Cache + prefetch
- Debounce user-driven calls
- Cancel stale requests
- Use optimistic UI carefully

## Output requirements
- Profiling evidence (what was measured)
- Identified hot path
- Fix plan with expected impact
- Re-measure results
- Regression guard (test/CI/monitor)
