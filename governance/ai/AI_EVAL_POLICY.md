---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# AI Evaluation Policy

Version: 1.0.0
Owner: AI Governance
Applies To: every production AI feature

---

## Principle

AI features ship only with **measurable behavior**. No AI feature reaches production on vibes.

## Required Before First Production Deploy

- declared model version pin (`gpt-4o-2024-08-06`, `claude-sonnet-4`, etc.)
- declared prompt version (commit SHA)
- eval set (≥ 50 cases for T2/T3, ≥ 200 for T1)
- baseline metrics on the eval set
- target metrics on the eval set
- red-team set covering: prompt injection, jailbreak attempts, off-topic abuse, data exfiltration probes, cost-DoS prompts
- per-call cost telemetry
- per-call latency telemetry
- per-call hallucination/error flag if applicable

## Required Metrics

| Metric | Required for | Threshold |
|---|---|---|
| Task accuracy / win rate on eval set | all | per ADR |
| Refusal rate on red-team set | all | ≥ 95 % for safety prompts |
| Hallucination rate | factual agents | per ADR |
| Latency p50 / p95 | all | per SLO_POLICY |
| Cost per call p50 / p95 | all | per COST_BUDGET_POLICY |
| Tool-call accuracy | tool-using agents | per ADR |
| Drift (vs baseline) | all | weekly snapshot, alert on > 5 % drop |

## Model & Prompt Versioning

- model version is pinned in code / config, never `latest`
- prompt files live in repo, semver'd
- changes to either require RFC if T1/T2, ADR if T3, changelog if T4
- A/B rollouts require eval-comparison report

## Prompt Injection Defense

Mandatory for any agent reading untrusted input (user input, web fetch, third-party content):
- input sanitization layer documented
- system-prompt isolation from user content (explicit delimiters or role separation)
- tool-use authorization gate (agent cannot escalate scope mid-task)
- output validation before action (validate before mutate)
- detection telemetry (suspicious-input counter)

See `governance/security/THREAT_MODEL_TEMPLATE.md` § AI-Specific Threats.

## Continuous Evaluation

- nightly eval run against current production prompt + model on the canonical eval set
- regression alert: any metric drop > 5 % vs last 7-day rolling baseline
- weekly drift report posted to AI-governance channel

## Required Per Production AI Feature

- eval set committed to repo
- nightly eval CI job
- model and prompt version label on every emitted span
- cost and latency on every emitted span
- kill switch (see `AI_KILL_SWITCH.md`)
- human override path (see `GLOBAL_AI_PROMPT_USAGE.md`)

## Forbidden

- shipping an AI feature without an eval set
- `latest` model strings in production
- silent prompt swaps
- letting AI read P0 secrets in any path
