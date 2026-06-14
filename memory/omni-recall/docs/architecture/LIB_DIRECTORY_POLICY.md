---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# Shared Library Directory Policy

## Snapshot Status

`src/lib/` is the dominant shared-library tree in this snapshot. `src/libs/persistence.ts` also exists and is actively referenced by repo code and tests.

Both `src/lib/` and `src/libs/` coexist in this snapshot.

Do not create a third shared-library directory.

## Current Import Patterns

Existing code imports the persistence helpers from `@/libs/persistence`, including:

```ts
import { persistentGet, persistentSet } from '@/libs/persistence';
```

Existing tests also mock or import `@/libs/persistence` directly.

## Directory Guidance

- Use existing `src/lib/` locations for shared-library code unless an existing import pattern requires `src/libs/`.
- Preserve existing `@/libs/persistence` imports when touching persistence call sites.
- Keep new documentation factual and tied to repository evidence in this snapshot.
