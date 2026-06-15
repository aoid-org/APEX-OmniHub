# Universal protocol — runtimes without code execution

For models/runtimes that cannot run code (no tests, no shell). Apply every STORIED pass by hand and keep the trace honest about what was reasoned versus run.

## Manual gate set

1. **Scope gate** — Write the one-line goal and the assumption list before producing any answer. If an unknown would change the answer, emit `UNCERTAIN: <gap>` and either ask or state the assumption you are proceeding on.
2. **Trace gate** — Narrate the mechanism in words: for code, simulate the execution path line by line; for logic, state each inference. No leap from premise to conclusion without the connecting step.
3. **Oppose gate** — Before finalizing, write at least one concrete attack on your own answer ("this fails if…"). If you cannot generate an attack, you have not looked hard enough — try inputs at the boundary, empty/null, concurrent, adversarial.
4. **Resolve gate** — Address each landed attack in the artifact or justify leaving it.
5. **Inspect gate** — Re-read against the Scope line. Confirm each requirement and assumption.
6. **Evidence gate** — Produce the verification trace. Because nothing was executed, every `Checked:` item is marked **"reasoned, not run"** — never imply a test passed that you did not run.

## Honesty rule for non-executing runtimes

The single most important adaptation: **do not describe checks you cannot perform.** Saying "tests pass" without running tests is the exact faked-success failure this skill exists to prevent. Reasoned verification is valuable and sufficient to declare — just label it as reasoning, not measurement.

## Minimal trace template

```
- Goal: <one line>
- Assumptions / UNCERTAIN: <list>
- Reasoned-checks: <what you mentally simulated> (reasoned, not run)
- Found: <issues from the Oppose gate>
- Residual risk: <unverifiable items>
```
