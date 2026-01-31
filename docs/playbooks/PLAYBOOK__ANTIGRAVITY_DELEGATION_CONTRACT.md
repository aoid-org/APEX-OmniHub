# PLAYBOOK: Antigravity Delegation Contract

> **System**: Google Antigravity  
> **Context**: OmniLink Task Delegation  
> **Status**: ACTIVE

## 1. The Contract

When delegating work to autonomous agents (Antigravity), the user MUST provide a **Task Packet** conforming to this contract. This ensures the agent has clear bounds, objectives, and acceptance criteria.

## 2. Task Packet Schema

Every task request to `/tasks` must include this JSON structure in `params.task`:

```json
{
  "title": "Short imperative task name",
  "objective": "What must be true when done",
  "repo": "APEX-OmniHub",
  "constraints": [
    "No new vendors",
    "Idempotent + reversible",
    "No secrets in code"
  ],
  "acceptance": [
    "Exact checks that must pass",
    "Commands and expected outputs"
  ],
  "changes": [
    { "pathHint": "file/area", "what": "exact change", "why": "reason" }
  ],
  "rollback": ["Exact reversal steps"]
}
```

## 3. Green Gate Rule

No task is considered complete until it produces:

1.  **IMPLEMENTATION_PLAN.md**: The map.
2.  **VERIFICATION_EVIDENCE.md**: The proof (logs, test outputs).
3.  **ROLLBACK_RUNBOOK.md**: The escape hatch.

## 4. Execution Flow

1.  **Plan**: Agent interprets Task Packet and creates `IMPLEMENTATION_PLAN.md`.
2.  **Execute**: Agent performs changes (atomic, safe).
3.  **Verify**: Agent runs `acceptance` checks and logs to `VERIFICATION_EVIDENCE.md`.
4.  **Complete**: Agent calls `/tasks/complete` with artifacts (or error).
