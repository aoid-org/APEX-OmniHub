# Omni-Recall Master Blueprint

Saved: 2026-05-23
Status: Active operating blueprint
Runtime: Claude Code (claude-sonnet-4-6) — remote execution, repo-persisted memory
Root: `.claude/omni-recall/` (repo-relative)

## 1. Non-Negotiable Reality Check

This blueprint only claims what is actually implementable in this runtime:

| Implementable now | Requires extra access (Phase 2) |
|---|---|
| Durable memory files in `.claude/omni-recall/` | Full ChatGPT/Claude account backfill |
| Structured canonical markdown pages | Gmail, Docs, Slack, Drive ingestion |
| Persistent operating rules across sessions (via git) | Silent background schedules or event hooks |
| Manual or user-provided export ingestion | Automatic account-wide historical crawling |
| Repo, GitHub, Supabase, web research when explicitly used | |
| Correction capture into permanent notes | |

The model must clearly label: verified fact · inference · claimed external evidence · missing access.

## 2. System Goal

Create a continuity engine that:
- reconstructs important history from available evidence
- compounds useful knowledge across sessions
- learns user preferences and corrections permanently
- reduces repeated prompting
- stays quiet unless a real conflict, gap, or decision appears

Target experience: **wind, not dashboard.**

## 3. Canonical Folder Shape

```
.claude/omni-recall/
  CLAUDE.md
  user-operating-model.md
  quality-bar.md
  do-not-do.md
  default-use-rule.md
  ingestion-rules.md
  omni-recall-master-blueprint-2026-05-23.md
  start-here.md
  raw/
    historical_exports/
  wiki/
    _core_directives/
    architecture_nodes/
    concepts/
    projects/
    decisions/
    open_loops/
    user_patterns/
    corrections/
    rejected_patterns/
    source_indexes/
  logs/
    ingestion/
    health_checks/
    correction_ledger/
  state/
    checkpoints/
```

## 4. Operating Layers

**Layer A — Raw Evidence:** Immutable source material. No edits after ingestion. Every derived claim traces here.

**Layer B — Compiled Knowledge:** Canonical markdown pages for concepts, projects, decisions, architecture. Aggressive deduplication. Cross-linking required when two pages materially affect one another.

**Layer C — Behavioral Memory:** How the user prefers work to be done. Recurring taste, framing, correction, and quality patterns. Used to improve first drafts.

**Layer D — Governing Rules:** Small files with stable rules only. No bloated essays. Precise directives over motivational language.

## 5. Claude Code Adaptation Rules

- "Implement into the system" = write durable memory files + commit to active branch
- "Retroactive" = ingest everything accessible through exports, uploaded files, repo history, connected tools
- "Automatic" = use the strongest available low-friction workflow, not fictional hidden access
- Memory persists across sessions only if committed and pushed — treat every session-end as a potential flush
- New sessions should read `start-here.md` then the required read order before beginning work

## 6. Correction Ledger Protocol

Every meaningful correction → evaluate into one of four destinations:
- Local page correction
- Project-wide correction
- Global directive
- User preference / style rule

Each correction entry stores: date · original wrong assumption · corrected state · scope · affected pages · whether the rule is permanent.

## 7. Historical Backfill Protocol

When historical exports are available:
1. Ingest chronologically into `raw/historical_exports/`
2. Build timeline
3. Extract recurring projects and concepts
4. Mine decisions and pivots
5. Mine friction and repeated corrections
6. Promote stable patterns into directives or `user-operating-model.md`

If exports are not available: build forward, mark backfill as pending.

## 8. Health Check Protocol

Audit periodically for: contradiction · duplicate pages · stale project framing · orphaned decisions · unresolved open loops · repeated corrections not yet promoted. Surface only high-signal findings.

## 9. Lazy-CEO Operating Contract

- No manual sorting if placement can be inferred safely
- No repeated prompting for already-known durable preferences
- No direct rewriting of raw evidence
- No bloated governance files
- No noisy dashboards or vanity reporting
- No silent elevation of weak or one-off preferences into permanent rules
- No broad context loading when targeted context is enough

## 10. 100/100 Quality Standard

Successful only if: truthful about runtime limits · useful without constant babysitting · structured enough to persist across sessions · quiet by default · able to get better from corrections · resistant to drift and duplication.
