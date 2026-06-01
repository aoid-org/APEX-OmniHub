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
- Last verified: 2026-06-01 · HEAD `86bc14a` · branch `work` (post PR #1274 OmniDash gap closure; PR #1309 security hardening in recent history)

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

## Canonical Architecture Facts (2026-06-01, verified)

| Fact | Value |
|---|---|
| APEX Agent display name | `APEX Agent` |
| APEX Agent function slug | `apex-agent` |
| APEX Agent Supabase function path | `supabase/functions/apex-agent/` |
| OmniSlate invocation path | `invokeMcpIntent` → `${SUPABASE_URL}/functions/v1/apex-agent` |
| Deprecated function | `apex-assistant` (returns 410 Gone, redirects to `apex-agent`) |
| Feature registry id | `apex-agent` (was `apex-assistant` — corrected 2026-05-30) |
| Current OmniDash shell | `apps/omnihub-site/dashboard/OmniDashShell.tsx` |
| Current platform-state authority | `docs/CURRENT_PLATFORM_STATE_2026_06_01.md` |
| Production DB migrations applied | 20260527000001 (AEGIS/CHRONOS), 20260528000000 (PhysiOmni RLS), 20260528000001 (OmniConnect Vault); later migration files exist in tree and require live verification before production-applied claims |

## Open Questions

- Which historical export source should be ingested first when provided?
- Which recurring correction patterns should be promoted next?
