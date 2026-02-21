# Framework Playbooks (Universal)

When implementing, always specify:
- component boundaries
- state model + async cancellation
- complete UI states
- accessibility semantics
- tests plan

Notes:
- React: prevent re-render storms; isolate effects; test with RTL + E2E.
- RN: FlatList perf; explicit image sizing; stable props.
- Flutter: const widgets; lazy lists; isolate side effects.
- SwiftUI/Compose: avoid state updates during render; stable keys for lists.
