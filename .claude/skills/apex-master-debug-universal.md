---
name: apex-master-debug
version: 1.0.0
description: >
  APEX-MASTER-DEBUG: Omnipotent, Omniscient, Predictive Debugging Intelligence.
  20x the power and efficiency of one-pass-debug. Gives any agent instant
  debugging mastery, surgical fix capability, AND proactive bug prediction before
  failures occur. Universal across ALL languages, frameworks, platforms, domains,
  and paradigms. Zero loops. Zero guessing. Zero drift.

  Triggers: debug, fix bug, error, crash, failing test, broken code, not working,
  exception, stack trace, troubleshoot, diagnose, investigate, predict bugs,
  proactive review, audit code health, pre-release check, refactor risk,
  performance issue, memory leak, race condition, silent failure, regression.

  Produces: Single surgical fix applied with 100% certainty, proactive bug
  elimination before deployment, and a permanent regression shield.
license: Proprietary — APEX Business Systems Ltd. Edmonton, AB, Canada.
compatibility: Claude, GPT-4o, Gemini, Llama 3, Mistral, DeepSeek, any LLM
archetype: Hybrid (Domain + Guardian + Workflow)
---

# APEX-MASTER-DEBUG v1.0

> **"Omniscient agents don't debug. They PREVENT. And when they must fix — ONE pass, ONE change, DONE."**

---

## CONTRACT

```
Input  → Bug report | error | stack trace | code review request | "it doesn't work"
           | proactive scan request | pre-release audit | performance complaint
Output → Surgical fix with zero guessing + proactive threat map of future failures
Success → Bug fixed in ONE change. Regression impossible. Future bugs predicted.
Fails  → Pre-flight not 100% green | root cause unproven | multiple simultaneous changes
```

---

## CORE DOCTRINE — THE IRON TRIAD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PILLAR 1 — OMNISCIENCE:  Know the cause before acting. Always.             │
│  PILLAR 2 — OMNIPOTENCE: One change. Complete fix. Zero side effects.       │
│  PILLAR 3 — PRECOGNITION: See the bug before the bug sees production.       │
│                                                                             │
│  EXECUTION ORDER: PREDICT → PREVENT → (if needed) FIX                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## MODE ROUTER — Enter Here

```
What is your situation?
├─ "I have a live bug / error / crash"        → REACTIVE MODE  (Phase 1–9)
├─ "Review this code before I ship"           → PREDICTIVE MODE (Phase P1–P5)
├─ "Something is slow / degraded"             → PERFORMANCE MODE (Phase X1–X4)
└─ "I want full system audit"                 → OMEGA SCAN (All phases in parallel)
```

---

# ═══ REACTIVE MODE — Bug Already Exists ═══

## PHASE 1: SCOPE LOCK ⟨2 min hard limit⟩

**Goal**: Lock exact problem boundaries. Zero ambiguity tolerated.

```
REQUIRED ANSWERS (all 5 — no exceptions):
□ What EXACTLY is broken? (One sentence. No "and".)
□ What is the EXPECTED behavior?
□ What is the ACTUAL behavior?
□ When did it LAST work? (Commit hash / timestamp / "never")
□ What CHANGED since it last worked?
```

```
Decision:
Can you answer ALL 5 with certainty?
├─ YES → Proceed to Phase 2
└─ NO  → STOP. Collect answers. DO NOT PROCEED PAST THIS LINE.
```

**Output Template**:
```
SCOPE: [exact symptom]
EXPECTED: [exact behavior]
ACTUAL: [exact behavior]
LAST GOOD: [timestamp/commit/never]
DELTA: [specific changes since last good state]
```

---

## PHASE 2: CONTEXT HARVEST ⟨5–15 min⟩

**Goal**: Collect ALL evidence. No assumption substitutes for evidence.

```
TIER 1 — ERROR EVIDENCE (mandatory)
□ Full stack trace — untruncated, exact copy
□ Exact error message — verbatim, not paraphrased
□ Error code, HTTP status, exit code if present
□ File path + line number of failure

TIER 2 — STATE EVIDENCE (mandatory)
□ Exact input / payload that triggers bug
□ Runtime environment (OS, language version, framework version)
□ Env vars and config active at time of failure
□ DB / API / cache state if applicable

TIER 3 — CODE EVIDENCE (mandatory)
□ Failing code block + 30 lines above/below
□ All functions/methods called within blast radius
□ Git diff since last known-good commit
□ Existing tests (passing AND failing)

TIER 4 — TEMPORAL EVIDENCE (mandatory)
□ First appearance timestamp
□ Frequency: always / intermittent / rare
□ Reproduction conditions (triggers vs non-triggers)
□ Any recent deployments, dependency updates, migrations
```

```
Evidence Sufficiency Gate:
Without guessing, can you answer:
├─ Which exact line fails?           NO → Add logging/breakpoints, re-collect
├─ Which exact value causes failure? NO → Inspect runtime state, re-collect
├─ Which exact condition triggers it?NO → Test variations, re-collect
└─ ALL YES → Proceed to Phase 3
```

---

## PHASE 3: TEMPORAL ROOT CAUSE ANALYSIS ⟨The APEX Core⟩

**Goal**: Travel through time. Find not just WHERE but WHEN and WHY the invariant broke.

### Step 3A — Build Causal Chain

```
Work BACKWARD from symptom to origin:

Symptom observed at → [Layer N]
    ↑ caused by what at → [Layer N-1]
    ↑ caused by what at → [Layer N-2]
    ↑ ... until you reach an IMMUTABLE ROOT

Do NOT stop at the first "cause." Keep asking "what caused THAT?"
until you reach the original invariant violation.
```

### Step 3B — The Deduction Matrix

```
╔══════════════════════════════════════════════════════════════════╗
║  HYPOTHESIS → EVIDENCE → VERDICT                                ║
╠══════════════════════════════════════════════════════════════════╣
║  H1: [theory — the obvious surface cause]                       ║
║    For:     [evidence supporting]                               ║
║    Against: [evidence contradicting]                            ║
║    Verdict: ✓ PROVEN | ✗ ELIMINATED | ? NEEDS DATA             ║
╠══════════════════════════════════════════════════════════════════╣
║  H2: [theory — upstream / feeding cause]                        ║
║    For: [...] | Against: [...] | Verdict: ✓ | ✗ | ?            ║
╠══════════════════════════════════════════════════════════════════╣
║  H3: [theory — environmental / config cause]                    ║
║    For: [...] | Against: [...] | Verdict: ✓ | ✗ | ?            ║
╠══════════════════════════════════════════════════════════════════╣
║  H4: [theory — timing / concurrency cause]    (if applicable)  ║
║  H5: [theory — integration / contract cause]  (if applicable)  ║
╚══════════════════════════════════════════════════════════════════╝

MINIMUM: 3 hypotheses. Generate more for complex/intermittent bugs.
```

### Root Cause Category Library

| Category | Subcauses to check |
|---|---|
| **Data** | null/undefined, wrong type, missing field, stale cache, encoding |
| **Logic** | off-by-one, wrong operator, inverted condition, unreachable branch |
| **State** | mutation leak, async race, lifecycle order, memory not released |
| **Config** | wrong env var, missing secret, dependency version mismatch |
| **Integration** | API contract change, timeout, auth expiry, schema drift |
| **Concurrency** | deadlock, race condition, thread starvation, atomic violation |
| **Resources** | OOM, disk full, connection pool exhausted, file descriptor leak |
| **Platform** | OS diff, browser compat, hardware architecture, timezone |

### Certainty Gate (NON-NEGOTIABLE)

```
⛔ BLOCKED UNTIL ALL FOUR ARE TRUE:
□ Exactly ONE hypothesis remains with overwhelming evidence
□ You can explain WHY every other hypothesis is wrong
□ You can predict EXACTLY what the fix will change in the code
□ You can describe this bug to a teammate in ≤30 seconds
```

---

## PHASE 4: BLAST RADIUS MAPPING

**Goal**: Know every system affected before touching anything.

```
For the identified root cause, map:
□ Every caller of the failing function/component
□ Every system that depends on the broken contract
□ Every test that will be affected (positively or negatively)
□ Every data artifact that may be corrupted
□ Every downstream consumer in APIs / queues / events

BLAST RADIUS CLASSIFICATION:
├─ CONTAINED   → ≤1 component affected. Low risk. Proceed.
├─ MODERATE    → 2–5 components. Document all. Proceed with care.
├─ WIDESPREAD  → 6+ components. STOP. Escalate. Coordinate fix.
└─ SYSTEMIC    → Architecture flaw. Fix cannot be local. Re-architect.
```

---

## PHASE 5: MENTAL SIMULATION ENGINE

**Goal**: Run the fix in your mind until 100% confident. Zero surprises in production.

```
SIMULATION PASS 1 — FORWARD TRACE
├─ Start at the root cause point
├─ Apply your fix mentally
├─ Trace execution forward through all affected paths
└─ Does every path reach the correct expected outcome? YES/NO

SIMULATION PASS 2 — BACKWARD TRACE
├─ Start at the desired outcome
├─ What must be true for your fix to produce this?
├─ Are ALL those preconditions guaranteed? YES/NO
└─ Any assumptions? → PROVE THEM or ELIMINATE THEM

SIMULATION PASS 3 — EDGE CASE SWEEP
□ Input is null / empty / undefined
□ Input is maximum size / boundary value
□ Function called zero times / once / many times
□ Function called out of expected order
□ Network / IO / DB fails mid-execution
□ Concurrent calls hit simultaneously
□ Fix applied to stale/corrupted state

SIMULATION PASS 4 — REGRESSION PROBE
□ Does fix break any existing passing tests?
□ Does fix change any observable contract for callers?
□ Does fix introduce any performance regression?
□ Does fix require a data migration or schema change?
```

**Simulation Output**:
```
FIX LOCATION: [file:line]
FIX ACTION:   [exact change]
FORWARD TRACE: PASS / FAIL
BACKWARD TRACE: PASS / FAIL
EDGE CASES: [list all checked]
BLAST RADIUS: [contained / moderate / widespread]
REGRESSION RISK: [none / low / medium — describe]
CONFIDENCE: [must be 100% to proceed]
```

---

## PHASE 6: PRE-FLIGHT GATE

**⛔ ABSOLUTE MANDATORY — ALL must be GREEN. No exceptions. No "mostly."**

```
╔══════════════════════════════════════════════════════════════╗
║                   APEX PRE-FLIGHT GATE                      ║
╠══════════════════════════════════════════════════════════════╣
║  □ Scope locked (no drift from original problem)            ║
║  □ ALL evidence collected (no gaps, no assumptions)         ║
║  □ Root cause PROVEN with evidence (not theorized)          ║
║  □ ALL other hypotheses ELIMINATED with evidence            ║
║  □ Blast radius fully mapped                                ║
║  □ Mental simulation: ALL 4 passes complete and passed      ║
║  □ Edge cases: ALL checked and accounted for                ║
║  □ Fix is MINIMAL (smallest change that resolves root)      ║
║  □ Fix is SURGICAL (touches only what root cause demands)   ║
║  □ Rollback plan exists for catastrophic edge case          ║
╠══════════════════════════════════════════════════════════════╣
║  ALL GREEN?  → Execute Phase 7                              ║
║  ANY RED/YELLOW? → Return to appropriate phase. FULL STOP.  ║
╚══════════════════════════════════════════════════════════════╝
```

---

## PHASE 7: SURGICAL EXECUTION

**Goal**: One precise incision. No exploratory surgery. No opportunistic changes.

```
EXECUTION LAWS (violate = restart from Phase 1):
1. Smallest change that resolves the proven root cause
2. ONE logical change per commit — always independently testable
3. If fix has multiple parts → each part is a separate commit
4. Comment WHY for any non-obvious line
5. Zero "while I'm here" improvements — fix the bug ONLY
6. Write the regression test BEFORE applying the fix (TDD-style)
```

**Fix Comment Template**:
```
// FIX: [issue ID or description]
// ROOT CAUSE: [one sentence — the proven WHY]
// CHANGE: [what this line does differently and why that resolves root cause]
// REGRESSION TEST: [test name / location]
[minimal code change]
```

**Post-Execution Validation**:
```
□ Reproduction test now PASSES
□ All existing tests still PASS
□ No new warnings or errors in logs
□ Manual verification of expected behavior confirmed
□ Edge cases from simulation manually verified
□ Performance unchanged (or improved)
```

---

## PHASE 8: CLOSURE & REGRESSION SHIELD

**Goal**: Bug cannot return. Pattern documented. Team informed.

```
CLOSURE CHECKLIST:
□ Root cause documented in plain language
□ Regression test committed (catches if bug returns)
□ Similar patterns searched in codebase (same bug elsewhere?)
□ Contributing factor addressed at systemic level if applicable
□ Team notified of pattern / antipattern discovered
```

**Closure Statement Template**:
```
BUG CLOSED:
Root Cause:      [one sentence, plain language]
Fix Applied:     [file:line — what changed]
Regression Test: [test name / path]
Pattern Risk:    [none | low — where else might this lurk]
Prevention Note: [one line about how to avoid this class of bug]
```

---

# ═══ PREDICTIVE MODE — Find Bugs Before They Exist ═══

## PHASE P1: THREAT SURFACE SCAN

**Goal**: Identify all high-risk zones before running a single line.

```
SCAN TARGETS — check ALL applicable:
□ Functions with no null checks on external inputs
□ Async operations without timeout or error handling
□ Mutable shared state accessed from multiple contexts
□ API calls without retry / circuit breaker
□ Auth checks that depend on order of execution
□ Type coercions that silently swallow errors
□ Loops with no termination guarantees
□ Resource allocations with no guaranteed release (files, connections, memory)
□ Magic numbers / hardcoded values that encode business logic
□ Error paths that silently catch and continue
```

---

## PHASE P2: PATTERN RECOGNITION ENGINE

**Goal**: Match code against known bug-producing patterns.

| Antipattern | Risk Level | Detection Signal | Remediation |
|---|---|---|---|
| Callback hell / nested async | HIGH | >3 nesting levels | Flatten with async/await |
| God function (>50 lines) | HIGH | Cyclomatic complexity > 10 | Decompose |
| Missing input validation at boundary | CRITICAL | Public API with no guard | Add validation layer |
| Optimistic error handling | HIGH | empty catch blocks | Explicit error strategy |
| Unguarded concurrent mutation | CRITICAL | Shared state, no lock | Mutex / immutability |
| Silent type coercion | MEDIUM | Loose equality (== vs ===) | Strict typing |
| Stale closure / captured var | HIGH | Async + closure + loop | Capture explicitly |
| N+1 query pattern | HIGH | Query inside loop | Batch / eager load |
| Premature optimization | MEDIUM | Complex path with no measurement | Benchmark first |
| Deployment config in code | CRITICAL | Hardcoded URLs/keys | Externalize to env |

---

## PHASE P3: RISK SCORE + PRIORITY MAP

**Goal**: Rank threats so the team fixes the most dangerous ones first.

```
For each identified threat, score:
  SEVERITY  × LIKELIHOOD × BLAST_RADIUS = RISK_SCORE (1–100)

  Severity:     Critical=4 | High=3 | Medium=2 | Low=1
  Likelihood:   Certain=4 | Probable=3 | Possible=2 | Unlikely=1
  Blast Radius: System=4  | Service=3  | Module=2  | Function=1

RISK_SCORE ≥ 30 → Fix before ship. No exceptions.
RISK_SCORE 15–29 → Fix in next sprint.
RISK_SCORE < 15  → Track in tech debt backlog.
```

---

## PHASE P4: PROACTIVE FIX GENERATION

**Goal**: Don't just report — output ready-to-apply fixes.

```
For each RISK_SCORE ≥ 30 threat:
1. Apply REACTIVE MODE phases 5–7 to the PREDICTED bug
2. Generate fix as if bug already occurred
3. Add test that would have caught this in production
4. Commit as "PREVENTIVE: [threat description]"
```

---

## PHASE P5: PREDICTIVE CLOSURE REPORT

```
THREAT MAP OUTPUT:
┌──────────────────────────────────────────────────────────┐
│ THREATS FOUND: [N]                                       │
│ CRITICAL (fix now):   [count] — [file:line list]         │
│ HIGH (fix this week): [count] — [file:line list]         │
│ MEDIUM (track):       [count] — [file:line list]         │
│ FIXES GENERATED:      [count] — ready to apply           │
│ TESTS ADDED:          [count] — regression shield ready  │
└──────────────────────────────────────────────────────────┘
```

---

# ═══ PERFORMANCE MODE — Slow / Degraded System ═══

## PHASE X1: BASELINE MEASUREMENT

```
Before ANY change:
□ Measure current baseline (P50, P95, P99 latency or throughput)
□ Profile: CPU, memory, I/O, network — identify top consumer
□ Reproduce under controlled conditions
□ Establish target metric and success threshold
```

## PHASE X2: BOTTLENECK ISOLATION

```
Top-down elimination:
├─ Is it the DATABASE?   → Query plans, indexes, N+1, connection pool
├─ Is it the NETWORK?    → Payload size, round trips, CDN, DNS
├─ Is it the COMPUTE?    → Algorithm complexity, blocking I/O, thread pool
├─ Is it the MEMORY?     → Allocation patterns, GC pressure, leaks
└─ Is it the CACHE?      → Hit rate, invalidation strategy, cold start
```

## PHASE X3: TARGETED OPTIMIZATION

```
Fix ONLY the proven bottleneck (same surgical rules as Phase 7)
Measure BEFORE and AFTER every change
Accept change ONLY if it meets target metric
Reject if change degrades anything else
```

## PHASE X4: PERFORMANCE CLOSURE

```
□ Before / after benchmarks documented
□ Regression test for performance added
□ Optimization explained in comments
□ Monitoring alert set at regression threshold
```

---

# ═══ ANTI-PATTERNS THAT CREATE LOOPS ═══

| Anti-Pattern | Translation | Consequence | Correct Action |
|---|---|---|---|
| "Let me try this" | Guessing | Infinite loops | Return to Phase 3 |
| "It might be..." | No evidence | Wrong fix | Return to Phase 2 |
| "Fix both at once" | Unknown cause | Can't verify | One change, one test |
| "Stack trace = root cause" | Shows WHERE not WHY | Surface fix only | Run Phase 3 fully |
| "Works on my machine" | Missing env evidence | Not reproducible | Add env to Phase 2 |
| "I've seen this before" | Pattern without proof | Wrong hypothesis | Prove it this time |
| "Quick fix, investigate later" | Technical debt | Bug returns | Closure Phase mandatory |
| "Tests are passing so it's fine" | Gaps in test coverage | Silent regression | Run prediction scan |

---

# ═══ DOMAIN QUICK-REFERENCE MATRIX ═══

| Domain | Phase 2 Additions | Phase 3 Focus Areas | Key Tools |
|---|---|---|---|
| **Frontend** | Console logs, network tab, DOM snapshots, perf timeline | State mgmt, async timing, hydration, event handlers | DevTools, React DevTools |
| **Backend API** | Request/response logs, middleware chain, auth tokens | Request lifecycle, serialization, error propagation | APM, structured logs |
| **Database** | Query plans, lock waits, transaction isolation logs | Indexes, joins, N+1, deadlock graph | EXPLAIN ANALYZE, pg_stat |
| **Mobile** | Device logs, crash reports, memory graph, battery | Lifecycle hooks, threading, platform API diff | Xcode Instruments, Perfetto |
| **Infrastructure** | System metrics, config diffs, deployment events | Resource limits, networking, IAM, DNS | Prometheus, CloudWatch |
| **ML/AI** | Training curves, tensor shapes, data samples, gradients | Data pipeline, model arch, hyperparams, distribution shift | TensorBoard, wandb |
| **Distributed** | Distributed traces, span timings, message queue depths | Idempotency, ordering, partial failure, timeouts | Jaeger, OpenTelemetry |
| **Security** | Auth logs, request patterns, input validation | Injection vectors, privilege escalation, token leakage | OWASP ZAP, Burp Suite |

---

## QUICK-REFERENCE CARD

```
┌─────────────────────────────────────────────────────────────────┐
│                   APEX-MASTER-DEBUG                             │
│              OMNIPOTENT DEBUGGING PROTOCOL                      │
├─────────────────────────────────────────────────────────────────┤
│  REACTIVE MODE (bug exists):                                    │
│  P1: SCOPE LOCK      → What EXACTLY is broken?                 │
│  P2: CONTEXT HARVEST → ALL evidence. No gaps.                  │
│  P3: TEMPORAL RCA    → Causal chain + deduction matrix         │
│  P4: BLAST RADIUS    → Map everything affected                 │
│  P5: SIMULATION      → 4-pass mental execution                 │
│  P6: PRE-FLIGHT      → ALL 10 checks green                     │
│  P7: SURGICAL FIX    → Minimal. Tested. Commented.             │
│  P8: CLOSURE SHIELD  → Regression test + documentation         │
├─────────────────────────────────────────────────────────────────┤
│  PREDICTIVE MODE (prevent bugs):                               │
│  PP1: THREAT SCAN    → High-risk zone identification           │
│  PP2: PATTERN ENGINE → Known antipattern matching              │
│  PP3: RISK SCORING   → Priority map (score ≥30 = fix now)     │
│  PP4: FIX GENERATION → Ready-to-apply preventive patches       │
│  PP5: THREAT REPORT  → Full map with counts and locations      │
├─────────────────────────────────────────────────────────────────┤
│  GOLDEN LAWS:                                                   │
│  • PREDICT before FIXING                                        │
│  • PROVE before TOUCHING                                        │
│  • ONE CHANGE — ALWAYS                                         │
│  • ZERO GUESSING — EVER                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## THE PROMISE (20x Upgraded)

Apply this protocol with discipline and you receive:

- **ZERO** "let me try this" loops — ever
- **ZERO** regression bugs from your fix
- **ZERO** hours wasted on symptoms vs root cause
- **20x** faster time-to-resolution vs ad hoc debugging
- **Proactive elimination** of bugs before they reach users
- **Permanent shields** that prevent entire bug classes from returning

**This is not debugging. This is OMNIPOTENT ENGINEERING.**

---

```
APEX-MASTER-DEBUG v1.0.0
Supersedes: one-pass-debug (all versions)
Compatibility: Claude, GPT-4o, Gemini Ultra, Llama 3, Mistral, DeepSeek, any LLM
License: Proprietary — APEX Business Systems Ltd. Edmonton, AB, Canada.
Copyright © 2026 All Rights Reserved
```
