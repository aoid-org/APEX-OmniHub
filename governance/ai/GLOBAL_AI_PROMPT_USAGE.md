# Global AI Prompt Usage

## Required Installation Points

Install `AI_AGENT_SYSTEM_PROMPT.md` into:
- coding agents
- review agents
- test-generation agents
- product/RFC agents
- incident-response agents
- deployment assistants
- support workflow assistants

## Required Behavior

AI-generated work must include:
- domain boundary awareness
- rollback plan
- observability plan
- scope boundaries
- test coverage
- regression risk notes

## Prohibited AI Behavior

AI agents must not:
- self-approve production merges
- silently create new domains
- bypass RFC requirements
- bypass architecture review gates
- generate unobservable production behavior
- introduce global mutable state

## Audit Rule

Every AI-generated production change must be attributable to:
- request origin
- agent/tool used
- files changed
- human reviewer
- approval record
