# Description Engineering

Read this when writing or fixing a skill's frontmatter description, or when a skill mis-triggers.

## Why the description decides everything

At startup, only `name` + `description` from every installed skill are loaded into context. The model picks skills from that text alone — the body is invisible at selection time. A skill with a flawless body and a vague description simply never runs. Two failure directions:

- **Under-trigger** (the common one): description too abstract → model handles the task unaided, badly. Counter: be concrete and slightly pushy.
- **Over-trigger**: keyword-stuffed description fires on adjacent tasks → wrong tool, wasted context, user distrust. Counter: one explicit exclusion clause.

## The formula

```
[Sentence 1] What it does. Third person, capability-level, no adjectives.
[Sentence 2] "Use when/whenever …" — 3-6 concrete user contexts, including
             casual phrasings ("turn this workflow into a skill").
[Sentence 3] "Does not cover …" — the single nearest near-miss task.
```

Budget ≤500 characters (spec hard cap 1024). Every installed skill pays its description cost in every conversation, so shorter compounding savings beat marginal recall.

**Anti-pattern — trigger dumping**: a comma list of 40+ keywords ("debug, fix, build, ship, go, start, any task…"). It collides with sibling skills, inflates the always-loaded tax, and reads as spam to marketplace curators. If the skill genuinely fires on everything, it is a persona, not a skill — split it.

**Good**:
```
Extracts text and tables from PDF files, fills forms, merges documents.
Use when working with PDF files or whenever the user mentions PDFs, forms,
or document extraction — even without naming a tool. Does not cover
scanned-image OCR pipelines.
```

## Trigger eval design

File: `evals/trigger-eval.json` — a JSON array:

```json
[
  {"query": "realistic user message", "should_trigger": true},
  {"query": "near-miss message",      "should_trigger": false}
]
```

Rules (enforced by `forge.py triggers`):
- ≥8 positive, ≥8 negative.
- Queries must read like real users: file names, typos, casual tone, backstory. "Format this data" tests nothing.
- **Negatives must be near-misses** — adjacent tasks sharing keywords (for a PDF skill: "convert this PDF link to a citation"). Obvious negatives ("write fibonacci") are filler.
- Substantive tasks only: models consult skills for work they can't trivially do unaided, so one-step trivia under-measures real triggering.

## Measuring (not just validating)

`forge.py triggers` certifies the set's structure and balance. The accuracy number itself needs a live harness:

- **Claude Code available** → run each query ~3x against the model with the skill installed, record trigger rate; the 60/40 train/test split protects against overfitting the description to the eval set. Write the measured rate into `scorecard.json.trigger_eval.measured_rate`.
- **No harness (claude.ai / API-only)** → ship the validated set in the package so any consumer can reproduce the measurement. Never write a rate you didn't run.

When trigger failures cluster, fix the description (sentence 2 for misses, sentence 3 for false fires) — not the body. The body was never the problem at selection time.
