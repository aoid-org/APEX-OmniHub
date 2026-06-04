# Omni-Recall Core Directives

## One-Line Definition

Omni-Recall is the canonical continuity system for this memory workspace: quiet by default, correction-driven, and grounded in accessible evidence.

## Why It Matters

It exists to reduce rediscovery, preserve durable project and preference memory, and improve future outputs without requiring constant maintenance.

## Current State

- Adopted on 2026-05-23 as the preferred continuity architecture
- Installed 2026-05-23 into `memory/omni-recall/` within APEX-OmniHub repo
- Runtime: Claude Code (ephemeral container; git repo is durable persistence)
- Session-load hook: repo root CLAUDE.md §29
- Historical backfill: pending external exports
- Multi-agent repo (verified 2026-05-29): Google Jules, Google Antigravity, OpenAI Codex, Dependabot also commit here — never assume Claude is the sole author.
- Last verified: 2026-06-04 · HEAD `ead5cd9f` · branch `feat/omnidash-production-hardening` (PR #1263 pending)

## Non-Negotiable Rules

- Never imply hidden access to inaccessible history or platform internals
- Prefer canonical updates over duplicate summaries
- Learn from corrections and promote stable ones
- Keep raw evidence immutable
- Surface only high-signal drift, conflict, risk, or decision needs
- Use absolute dates when clarity matters; default user timezone is `America/Edmonton`

## Related Pages

- [[omni-recall-source-index]]
- [[omni-recall-user-patterns-seed]]
- [[current-status]]

## Source References

- `memory/omni-recall/raw/historical_exports/2026-05-23-user-upload-omni-recall-blueprint.md` (original GPT path: `/workspace/user_files/01-Pasted-text-26-.txt`)
- `memory/omni-recall/omni-recall-master-blueprint-2026-05-23.md`

## Open Questions

- Which historical export source should be ingested first when provided?
- Which recurring correction patterns should be promoted next?
