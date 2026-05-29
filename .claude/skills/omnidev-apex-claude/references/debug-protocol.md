# DEBUG ANNIHILATOR — OMNIDEV-APEX Reference

## Activation
Triggered by: debug, fix bug, error, broken, failing, crash, exception, not working

## Non-Negotiable Laws
1. bash_tool REPRODUCES the bug before ANY fix is written
2. Root cause proven — not assumed — before fix applied
3. Regression test written BEFORE fix (TDD on the bug)
4. Fix addresses root cause — not symptom
5. 2 failed hypotheses → question the ARCHITECTURE, not the code

## Debug Protocol

```
PHASE 1 — OBSERVE (bash_tool mandatory)
  bash_tool: reproduce exact error
  Read FULL stack trace — not just last line
  Capture: error message + line + environment + inputs

PHASE 2 — ISOLATE
  bash_tool: minimal reproduction case
  Strip down to smallest failing test
  Confirm isolation: works without X, fails with X

PHASE 3 — HYPOTHESIZE
  ONE theory. Evidence-based. Not "I've seen this before."
  State: "If [X] is true, then [Y] will happen when I do [Z]"

PHASE 4 — PROVE
  bash_tool: targeted test for hypothesis
  Hypothesis confirmed? → proceed to fix
  Hypothesis false? → return to Phase 3 with new theory
  2nd false hypothesis? → question architecture

PHASE 5 — FIX (surgical)
  str_replace_editor: minimal change to address root cause
  bash_tool: confirm fix resolves original error
  bash_tool: confirm no regressions (full test suite)

PHASE 6 — HARDEN (mandatory — never skip)
  Write regression test for this exact bug
  bash_tool: confirm test catches original failure
  Document: bug + root cause + fix + prevention in code comment
```

## Extended Thinking Triggers
Activate for:
- Distributed system bugs (race conditions, network partitions, clock skew)
- Intermittent failures (non-deterministic reproduction)
- Security vulnerabilities (attack surface analysis)
- Performance regressions (multi-variable causation)

## Common Root Cause Patterns

```
Race condition:    Missing mutex/lock | shared mutable state | async without await
N+1 query:         Loop contains DB call | ORM lazy-load in iteration
Memory leak:       Event listener not removed | circular reference | closure captures large object
Auth bypass:       Missing middleware | wrong route order | JWT not verified | role check skipped
Cache stampede:    TTL expiry + high traffic | missing lock-before-set
Idempotency bug:   Retry without idempotency key | no dedup check
SSRF:              User-controlled URL passed to fetch | no allowlist
Injection:         String interpolation in query/command | missing sanitization
```

## Distributed Debug Protocol
```bash
# bash_tool sequence for distributed bugs
# 1. Correlate traces
curl -s "http://jaeger:16686/api/traces?service=my-service&limit=10"

# 2. Check error rates by service
kubectl logs -n production deploy/my-service --since=15m | grep ERROR

# 3. Diff deployment (what changed?)
kubectl rollout history deploy/my-service

# 4. Check downstream dependencies
kubectl exec -it deploy/my-service -- curl -v http://downstream:port/health
```

## Verification Evidence Template
```
bash_tool output:
$ npm test -- --grep "bug reproduction"
[BEFORE FIX] ✗ reproduces original error → confirmed
[AFTER FIX]  ✓ regression test passes
Full suite: all X tests passing
Exit: 0
```
