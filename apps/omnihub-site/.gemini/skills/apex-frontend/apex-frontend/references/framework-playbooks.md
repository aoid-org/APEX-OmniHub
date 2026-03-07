# Framework Playbooks (quick implementation guides)

Use this when translating specs to code in a specific stack.

## React / Next.js
- Prefer server components where appropriate; isolate client state.
- Avoid re-render storms: memoize, stable callbacks, selectors.
- Forms: react-hook-form or equivalent; validate on blur/submit.
- Animations: CSS transforms; requestAnimationFrame only when needed.
- Testing: React Testing Library + Playwright/Cypress for E2E.

## Vue
- Use composition API; keep state in stores (Pinia) for shared state.
- Avoid watchers as business logic dumping ground; keep clear actions.

## Svelte
- Stores for shared state; avoid overusing derived stores that create loops.
- Keep transitions lightweight.

## React Native
- Lists: FlatList with proper keyExtractor; memoize rows.
- Images: size explicitly; cache; avoid huge decode on main thread.
- Navigation: respect back; avoid deep nested modals.
- Performance: avoid inline objects in render; use useCallback/useMemo carefully.

## Flutter
- Use const widgets where possible; avoid rebuild storms.
- Lists: ListView.builder; keep item widgets small.
- State: Riverpod/Bloc/etc; keep side effects isolated.
- Animations: prefer implicit animations for simple transitions.

## SwiftUI
- State: @State/@StateObject/@ObservedObject correctly; avoid updating state during body.
- Lists: use identifiable models; beware heavy view hierarchies.
- Accessibility: use modifiers to label and group elements.

## Jetpack Compose
- State hoisting; remember/derivedStateOf; avoid recomposition pitfalls.
- LazyColumn for lists; stable keys; minimize allocations in composables.
- Material patterns: consistent theming and semantics.

## Output expectations
When implementing, always provide:
- component boundaries
- state model
- handling for loading/empty/error/offline
- a11y semantics
- tests plan
