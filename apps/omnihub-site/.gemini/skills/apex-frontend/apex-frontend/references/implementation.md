# Implementation & Architecture (frontend)

## Default architecture (portable)
- **Tokens**: color roles, spacing, type scale, radius, elevation, motion
- **Components**: pure + reusable + documented states
- **State model**: reducers / view-model / state machine (single source of truth)
- **Screens**: composition only (minimal business logic)
- **Effects**: API, storage, permissions, analytics (isolated)

## State management rules
- Unidirectional data flow: events → state → UI.
- Async effects isolated; cancel stale requests.
- Avoid derived state duplication; derive at render.
- Prefer explicit state enums over boolean soup.

### Anti-patterns
- Logic in render functions
- Multiple competing sources of truth
- Deep prop drilling without reason (use context/store)
- Side effects in constructors / render

## Component boundaries
- Container vs Presentational split
- Data-fetching belongs above reusable components
- Components accept data + callbacks; they don’t fetch.

## Concurrency + race handling
- Use request IDs / abort controllers / cancellable jobs.
- Ignore stale responses.
- Debounce search, but show progress.

## Styling strategy (choose one, document it)
- Web: CSS modules / Tailwind / styled-components (be consistent)
- Native: platform styling + tokens
- Cross-platform: token mapping

## Output structure for implementation
- Architecture diagram (ASCII ok)
- Component list and props
- State model (types + transitions)
- API contracts (request/response)
- Tests plan
