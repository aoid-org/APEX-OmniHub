---
version: 1.0.0
last_audited: 2026-06-12
status: verified
---

# AI Kill Switch Policy

Version: 1.0.0
Owner: AI Governance + Operations
Applies To: every production AI agent, copilot, batch AI pipeline, autonomous agent loop

---

## Principle

Every AI system in production must have a documented, tested, single-command way to **stop it within 60 seconds**, regardless of scope.

## Required Kill-Switch Modes

| Mode | Scope | Trigger | Recovery |
|---|---|---|---|
| **Soft pause** | One agent / pipeline | feature flag flip | flip back |
| **Hard stop** | All AI in one domain | infra-level flag (env var or KMS-controlled config) | re-enable + audit log entry |
| **Full kill** | All AI across product | top-level kill switch | post-incident review + RFC to restart |

Each must be:
- documented in the service's runbook
- tested in a fire drill at least quarterly
- accessible to on-call without engineering escalation

## Required Per AI System

- declared kill-switch mechanism (which switch turns it off)
- declared expected behavior under kill (graceful degradation, fallback, error message)
- declared time-to-kill (must be ≤ 60 s for any T1/T2 AI feature)
- declared audit event emitted on kill activation

## When to Kill

- runaway loop detected (e.g. agent calling itself recursively beyond N steps)
- cost burn alert: hourly spend > 5× weekly average
- safety incident: agent took a damaging action
- security incident: prompt injection or exfiltration evidence
- regulatory: lawful demand
- third-party model provider outage causing partial dangerous behavior

## After Kill

- declare SEV
- preserve agent state, prompts, tool-call logs, outputs
- complete incident response
- restart requires architecture-review-level sign-off

## Forbidden

- AI systems in production without a documented kill switch
- kill switch that requires code change to activate
- kill switch behind > 1 person's credentials
- silent kill (no audit event, no notification)
