---
name: universal-apex-debug
version: 1.0.0
edition: universal
license: Proprietary — APEX Business Systems Ltd.
replaces: universal-debug
description: >
  Forges definitive root-cause solutions across code, systems, product, strategy, and life
  by upgrading the 7-step debug protocol with triage classification, domain fast-paths,
  adversarial self-verification (STORIED), and blast-radius containment. Use whenever
  facing recurring bugs, stuck states, decision loops, incident response, pattern breaks,
  or any situation where patches keep failing and loops keep reopening. Does not replace
  domain-specific build or design skills.
---

# UNIVERSAL-APEX-DEBUG v1.0.0 — Universal Edition
> *"Stop patching symptoms. Find the source. Break the loop. Structurally. Forever."*

**Input**: Any stuck state, recurring failure, loop, or unsolved problem — any domain.
**Output**: Root-cause fix + prevention safeguard + adversarial validation trace.
**Success**: Loop cannot recur structurally. Prevention is built in, not manual.
**Fails when**: Stopped at symptom, no adversarial gate run, prevention skipped.

---

## STEP 0 — TRIAGE (60 seconds; run before everything else)

```
CLASSIFY domain:
  A. Code / CI / Infra      → fast path: 1→2→3→5→7 | ref: domain-playbooks.md#code
  B. Product / UX / Flow    → fast path: 1→3→6→7   | ref: domain-playbooks.md#product
  C. Strategic / Decision   → fast path: 1→4→5→7   | ref: domain-playbooks.md#strategy
  D. Life / Pattern         → fast path: 1→3→6→7   | ref: domain-playbooks.md#life
  E. AI / Prompt loop       → fast path: 3→4→6→7   | ref: domain-playbooks.md#ai
  F. Compound / Unknown     → full 7-step, no shortcuts

SEVERITY:
  P0 — Production down       → MITIGATE FIRST. Then debug from Step 1.
  P1 — Recurring, no crisis  → full 7-step
  P2 — Pattern detected early → predictive path: Step 3 → 6 → 7
```

If class AND thread are already confirmed: enter at Step 3.
If Step 7 is already reachable: skip to adversarial gate and close.

---

## APEX 7

### 1 — DISTANCE  *(Break proximity bias)*
Apply when: editing same thing 2+ times; reacting without seeing pattern; tunnel vision.
```
STOP all current action
STATE the problem without naming the symptom
MAP: known facts | open assumptions | unknown unknowns
```
Gate: Can describe the problem without mentioning the symptom? → Step 2.

### 2 — WHOLE SYSTEM  *(Expand to full context)*
Apply when: blast radius unknown; fix breaks something else; pattern is multi-site.
```
TRACE execution path start → end (actual path, not intended)
MAP all dependencies — what touches what
TIMELINE: when did this start? what changed immediately before?
SCOPE blast radius before touching anything
```
Gate: Can locate the problem inside a system map? → Step 3.

### 3 — THREAD  *(What repeats is the root)*
Apply when: same error multiple locations; problem returns after "fix"; multiple symptoms.
```
LIST all instances of the failure
COMPARE: what is identical across every instance?
STATE the pattern: "Every time X → Y breaks because Z"
TRACE thread to its origin point
```
Gate: One-sentence pattern statement exists, is specific, and traces to origin? → Step 4.

### 4 — DEDUCE  *(Rule out; arrive at what must be true)*
Apply when: multiple candidate solutions; guessing; need to eliminate wrong paths.
```
GENERATE ≥3 hypotheses
SCORE each: (impact × confidence) ÷ (complexity × risk)
ELIMINATE every hypothesis that targets symptom, not root
STATE why this solution is inevitable — not just plausible
```
Gate: Can explain why every rejected path fails at root level? → Step 5.

### 5 — VERIFY  *(Evidence, never assertion)*
Apply when: before declaring solved; after implementing; proof required.
```
WRITE failing test / proof-of-failure BEFORE applying fix
FIX the root cause location only (minimum blast radius)
RUN full validation: tests + metrics + edge cases
DOCUMENT: logs, traces, or metrics — never "should work"
```
Gate: Quantifiable proof the loop is broken? → Step 6.

### 6 — ELEVATE  *(Rise to where the solution lives)*
Apply when: stuck at same thinking level; insight needed; meta-pattern active.
```
ASK: "What would the expert see that I'm missing?"
REFRAME: one level up — code → arch → system → design philosophy
DETERMINE: local bug or structural design debt?
```
Gate: Solution obvious from elevated view? "It was never X — it was always Y." → Step 7.

### 7 — DEFINITIVELY  *(Break the loop forever)*
Apply: ALWAYS — this is the only acceptable exit from any debug session.
```
FIX root cause, not symptom
ADD structural prevention: test, lint rule, guard, policy, schema constraint
DOCUMENT: what broke → why → what changed → how to detect early
VALIDATE: "This CANNOT recur" — backed by evidence, not belief
```
Gate: Prevention is structural, not a manual check? → Adversarial Gate.

---

## ADVERSARIAL GATE  *(mandatory before closing any session)*

STORIED-derived discipline. Run all four. No skips.

```
[1] ASSUMPTION AUDIT
    List every assumption baked into the fix.
    For each: what evidence supports it? Label gaps UNCERTAIN: <gap>.

[2] ADVERSARIAL PROBE
    Argue against your own solution.
    What edge case, hidden coupling, or state sequence reopens the loop?

[3] BLAST RADIUS CHECK
    What was working before this fix?
    Does the change affect anything outside the root-cause location?
    Confirm diff is surgical and containment is verified.

[4] RECURRENCE TEST
    Can the exact sequence that caused the loop be reproduced?
    Does the fix block it structurally — without any manual step?
```

Any challenge fails → return to the step its failure targets.
All four pass → adversarially validated. Ship. ✓

---

## DOMAIN FAST PATHS

| Domain | Entry | Deep reference |
|--------|-------|----------------|
| Code / CI / Infra | 1→2→3→5→7 | `references/domain-playbooks.md#code` |
| Product / UX / Flow | 1→3→6→7 | `references/domain-playbooks.md#product` |
| Strategy / Decision | 1→4→5→7 | `references/domain-playbooks.md#strategy` |
| Life / Pattern | 1→3→6→7 | `references/domain-playbooks.md#life` |
| AI / Prompt loop | 3→4→6→7 | `references/domain-playbooks.md#ai` |

Full 7-step always available. Fast paths compress when triage confirms domain.

---

## ANTI-PATTERNS

| Pattern | Why it fails |
|---------|-------------|
| Skip triage | Solve wrong problem correctly; loop continues |
| Deduce before Whole | Symptom fix; root survives |
| Stop at Step 5 | Tests pass but prevention missing; loop returns |
| Skip adversarial gate | Edge cases reopen loop on next deploy |
| Patch under P0 pressure | Weds codebase to workaround permanently |
| "Good enough" exit | Loop is paused, not broken |

---

## INTEGRATION (vendor-agnostic)

Core protocol requires no tooling. For environments with code execution:
- Pre-Step 1: use any problem-framing tool (e.g. 5-Whys, Riddle Prompt, STORIED)
- Steps 2–5: use any codebase access, static analysis, or tracing tools available
- Step 7: use any test runner, linter, or schema validator available
- Post-Step 7: use any user-validation or smoke-test tool available

For APEX/Claude-native integrations → see Claude-native edition MANIFEST.json.

Runtime without code execution → follow `references/universal-protocol.md`.
Extended adversarial attacks → `references/adversarial-patterns.md`.
IAS tier selection → `references/ias-tiers.md`.

---

## SUCCESS CRITERIA

| Domain | Loop is broken when... |
|--------|----------------------|
| Code | Regression test added; same bug cannot recur structurally |
| Product | Backend-verified outcome — not just UI success state |
| Strategy | Decision made, rollback defined, metrics instrumented |
| Life | Pattern is architected out — transferable wisdom, not endurance |
| AI/Prompt | Template exists; vague input cannot structurally produce vague output |

---

> *"The loop ends when prevention is structural, validation is evidence-based,*
> *and recurrence is architecturally impossible — not just unlikely."*
>
> **UNIVERSAL-APEX-DEBUG v1.0.0** | Olympus Edition — Universal
> *Upgraded from universal-debug. APEX Business Systems Ltd.*
