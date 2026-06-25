# Adversarial Patterns — Phase 5 OPPOSE Reference

## Contents
1. [Universal attack vectors](#universal)
2. [Code-specific attacks](#code)
3. [Architecture attacks](#arch)
4. [Strategy / decision attacks](#strategy)
5. [AI prompt attacks](#ai)
6. [Process attacks](#process)

---

## Universal Attack Vectors {#universal}

Apply these to ANY hypothesis before accepting it:

| Attack | Question | Failure signal |
|---|---|---|
| Survivorship | "Are you only looking at cases where this explanation fits?" | Yes → sampling bias |
| Correlation | "Does X cause Y or do they share a hidden cause Z?" | Z found → wrong root |
| Scope creep | "Is the 'fix' actually solving a different problem?" | Yes → solution drift |
| Recency bias | "Did you anchor on the most recent change rather than earliest cause?" | Yes → wrong timeline |
| Complexity bias | "Is the simplest explanation already sufficient?" | Overcomplicated fix → Occam violated |
| Authority bias | "Did you accept this hypothesis because a senior person said it?" | Yes → re-verify independently |
| Confidence > evidence | "Is the confidence level backed by actual checks or intuition?" | Intuition → run Phase 7 first |

---

## Code-Specific Attacks {#code}

| Attack | How to run it |
|---|---|
| Race condition check | Reproduce at 10× concurrency. Does timing change outcome? |
| State isolation check | Can two calls interfere via shared mutable state? |
| Contract mismatch | Do the producer's types exactly match the consumer's expectations? |
| Environment delta | List every difference between env where it works vs where it fails |
| Silent failure | Does the error get swallowed anywhere in the call chain? |
| Boundary condition | Does it fail at n=0, n=1, n=max, n=max+1? |
| Timeout / retry storm | Does a timeout cause a retry that causes another timeout? |

---

## Architecture Attacks {#arch}

| Attack | How to run it |
|---|---|
| Coupling probe | Remove module X. How much else breaks? If >2 things → over-coupled |
| Abstraction leak | Does caller know implementation details of the callee? |
| Load spike | What breaks first at 10× current traffic? Is that acceptable? |
| Cascade failure | If service A goes down, does B cascade? Is there a circuit breaker? |
| Schema drift | Is the API contract explicitly versioned? Who owns migration? |

---

## Strategy / Decision Attacks {#strategy}

| Attack | How to run it |
|---|---|
| False dichotomy | Is this actually binary or are there 3+ paths? |
| Sunk cost | Would you make this decision today if you started fresh? |
| Reversibility test | If wrong, what's the rollback? If no rollback → is confidence justified? |
| Incentive distortion | Who benefits from the current framing? Could that bias the options? |
| Time pressure | Is urgency real or manufactured? Does it justify skipping rigor? |

---

## AI Prompt Attacks {#ai}

| Attack | How to run it |
|---|---|
| Ambiguity scan | Read the prompt as if you've never seen it. What would you assume? |
| Context limit | Is critical context truncated or absent? |
| Format clash | Is the requested format at odds with the model's natural output? |
| Negative space | What did you NOT say that the model might fill with assumptions? |
| Eval absence | Is there a clear, testable success criterion? Without one → cannot verify |

---

## Process Attacks {#process}

| Attack | How to run it |
|---|---|
| Single owner risk | If the primary owner is sick, who does step X? |
| Stale runbook | When was this last tested? Does it still match current infrastructure? |
| Alert blindness | Is the monitor alerting someone who will actually act on it? |
| Handoff gap | Is there an explicit handoff or does it "just happen"? |
| Undocumented exception | What happens for the 10% of cases outside the normal path? |
