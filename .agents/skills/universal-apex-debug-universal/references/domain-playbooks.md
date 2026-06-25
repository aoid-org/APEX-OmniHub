## Contents
1. [#code — Code / CI / Infra](#code)
2. [#product — Product / UX / Modal](#product)
3. [#strategy — Strategic / Decision](#strategy)
4. [#life — Life / Pattern](#life)
5. [#ai — AI / Prompt loop](#ai)

---

## #code — Code / CI / Infra

**Fast path**: Step 1 → 2 → 3 → 5 → 7

**Step 2 checklist (system map)**:
- Trace actual call stack, not intended flow
- Map: source file → build → test → deploy → runtime
- Identify: env vars, secrets, DB migrations, feature flags in scope
- Confirm blast radius: which modules share the broken dependency?

**Step 3 (thread)**:
- Check git log: when did first occurrence land? What PR?
- Search codebase for every instance of the error signature
- Pattern statement format: "In every environment where X config is set, Y fails because Z import resolves incorrectly."

**Step 5 (verify)**:
- Write failing test first (TDD approach to root-cause confirmation)
- After fix: `eslint . --max-warnings 0`, full test suite, type check
- For CI: reproduce failure locally before declaring resolved
- Evidence: test output + build log + diff — not a screenshot of green

**Step 7 (prevent)**:
- Options: regression test, lint rule, schema constraint, CI gate, env validation on startup
- Document in PR: root cause, affected scope, prevention mechanism, detection signal for next time

**Adversarial gate critical Q**: "Does the fix work only in the current environment, or in all envs (dev/staging/prod)?"

---

## #product — Product / UX / Modal

**Fast path**: Step 1 → 3 → 6 → 7

**Core riddle (apex-riddler integration)**:
"Does this [screen/modal/flow] actually [complete the intended outcome], or does it merely [simulate completion]?"
- Gate 1: Outcome guaranteed (not just UI state change)?
- Gate 2: Backend function executes (not mocked/stubbed)?
- Gate 3: DB mutation confirmed (not toast without write)?
- Gate 4: Failure state handled (not user stranded)?

**Step 3 (thread)**:
- List every screen/flow with same broken pattern
- Common root causes: missing backend wire, demo data fallback, modal stub, schema mismatch
- Pattern: "Every module that calls handleModuleState() returns demo data because X."

**Step 7 (prevent)**:
- Add integration test asserting backend response shape
- Remove all demo/mock fallback from production code paths
- Add Playwright E2E covering the happy path AND at least one error state

---

## #strategy — Strategic / Decision

**Fast path**: Step 1 → 4 → 5 → 7

**Step 1 (distance)**:
"What decision are we actually avoiding, and what is the cost of continued avoidance?"

**Step 4 (deduce)**:
Use RAPID framework as scoring grid:
- R: Recommend | A: Agree | P: Perform | I: Input | D: Decide
- Score each option: reversibility × impact × confidence ÷ delay cost
- Eliminate options that require perfect information (it will never exist)

**Step 5 (verify)**:
- Define the smallest reversible experiment that produces real signal
- Set measurement criteria BEFORE running the experiment
- "We will know this worked when [metric] moves [direction] by [amount] in [timeframe]."

**Step 7 (prevent)**:
- Document the decision with: context, options considered, why chosen, success metrics, rollback trigger
- Set a review date — not a permanent commitment, a checkpoint

---

## #life — Life / Pattern

**Fast path**: Step 1 → 3 → 6 → 7

**Step 1 (distance)**:
"This is not the end. This is a position. What is the actual structural cause, not today's feeling?"

**Step 3 (thread)**:
- Timeline every instance of the pattern
- Find the common decision point: "Every time I chose comfort over growth, this followed."
- The thread is always a decision pattern, not an event pattern

**Step 6 (elevate)**:
- Reframe: "I am not broken. I am at bedrock — the lowest compression point before reconstruction."
- Rise to: "What is this pattern trying to protect me from? What would I have to believe to keep it?"
- Solution exists at the level of belief architecture, not behavior management

**Step 7 (prevent)**:
- Build structural change: systems, environment design, accountability, new defaults
- The prevention is NOT willpower — it is friction reduction for the right choice
- Teach the pattern to someone else: you have mastered it when you can transfer it

---

## #ai — AI / Prompt Loop

**Fast path**: Step 3 → 4 → 6 → 7

**Step 3 (thread)**:
- Every shallow response came when: context was missing | constraints were absent | success criteria were undefined
- Pattern: "Vague input structurally produces vague output — this is not a model failure."

**Step 4 (deduce)**:
- Root cause is always in the input architecture: no role, no constraints, no examples, no format spec
- Fix target: the prompt template, not the model

**Step 7 (prevent)**:
- Build a prompt template with: role + task + constraints + examples + output format + success criteria
- Test with edge inputs (ambiguous, adversarial, minimal)
- "Vague input cannot structurally produce vague output" — verify this is architecturally true
