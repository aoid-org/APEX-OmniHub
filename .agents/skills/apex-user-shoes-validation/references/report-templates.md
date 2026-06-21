# Report Templates

## Surface validation matrix

```markdown
| Surface | Intended product purpose | User action | Expected behavior | Actual behavior | Works or gated honestly? | Visual unity preserved? | Evidence | Result |
|---|---|---|---|---|---|---|---|---|
```

## Action validation matrix

```markdown
| Surface | Action | Expected | Actual | Backend call? | User-visible result | Decision |
|---|---|---|---|---:|---|---|
```

## Visual change review

```markdown
## Visual Change Review

File:
Proposed change:
Before screenshot:
After screenshot:
User value preserved:
Visual quality preserved or improved:
Decision: APPROVE / REJECT
Reason:
```

## GO / NO-GO report

```text
USER-SHOES VALIDATION REPORT

Decision: GO / NO-GO / BLOCKED

Scope:
Environment:
Commit/PR/deploy:
Auth state:

Confirmed product truth:
- ...

Surfaces validated:
| Surface | Purpose clear? | Functioning? | Relevant? | Logical user path? | Visual unity? | Result |
|---|---:|---:|---:|---:|---:|---|

Actions validated:
| Surface | Action | Expected | Actual | Backend call? | Final UX |
|---|---|---|---|---:|---|

Visual review:
- visual degradation observed:
- before/after screenshots:

Tests:
- typecheck:
- lint:
- unit/integration:
- build:
- browser validation:

Security:
- secrets exposed:
- destructive DB action:
- unsafe auth/token evidence:

Remaining blockers:
- ...

Next executable action:
- ...
```

## Implementation handoff prompt skeleton

```text
MISSION:
[precise rescue/fix/certification objective]

CANONICAL TRUTH:
[product truth and drift patterns to reject]

NON-NEGOTIABLES:
- no secrets
- no visual degradation
- no fake success
- no unsupported backend calls

FILES TO INSPECT:
- ...

IMPLEMENTATION:
- ...

TESTS:
- ...

BROWSER VALIDATION:
- ...

GO / NO-GO RULES:
- ...
```
