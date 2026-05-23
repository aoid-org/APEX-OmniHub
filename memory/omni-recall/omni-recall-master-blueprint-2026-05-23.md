# Omni-Recall Master Blueprint

Saved: 2026-05-23
Status: Active operating blueprint for future GPT-based runs
Purpose: Retroactive, low-noise, self-maintaining knowledge and preference system adapted to this runtime's real capabilities

## 1. Non-Negotiable Reality Check

This blueprint is only valid if it distinguishes between:
- Implementable now in this GPT agent runtime
- Implementable later with added exports, connectors, or platform support

The system must never imply global account scraping, hidden model-weight updates, or native always-on hooks unless those capabilities are actually available.

## 2. What Is Implementable Now

- Durable memory files in `/workspace/memory`
- Structured local knowledge folders and canonical markdown pages
- Persistent operating rules for future runs
- Manual or user-provided export ingestion
- Repo, GitHub, Supabase, and web-assisted research when explicitly used
- Correction capture into permanent notes
- Drift prevention through canonical directives and reuse rules

## 3. What Requires Extra Access

- Full historical ChatGPT/Claude/Gemini account backfill
- Gmail, Docs, Slack, Discord, and Drive ingestion
- Silent background schedules or event hooks across external tools
- Automatic account-wide historical crawling from day one

These are Phase 2 capabilities and require exports, APIs, or platform-level connectors.

## 4. System Goal

Create a continuity engine that:
- reconstructs important history
- compounds useful knowledge
- learns user preferences and corrections
- reduces repeated prompting
- stays quiet unless a real conflict, gap, or decision appears

The target experience is "wind, not dashboard."

## 5. Canonical Folder Shape

```text
/workspace/memory/omni-recall/
  CLAUDE.md
  user-operating-model.md
  quality-bar.md
  do-not-do.md
  omni-recall-master-blueprint-2026-05-23.md
  /raw
    /historical_exports
    /chat_exports
    /repo_history
    /docs_and_briefs
  /wiki
    /_core_directives
    /architecture_nodes
    /concepts
    /projects
    /decisions
    /open_loops
    /user_patterns
    /corrections
    /rejected_patterns
    /source_indexes
  /logs
    /ingestion
    /health_checks
    /correction_ledger
```

## 6. Operating Layers

### Layer A: Raw Evidence
- Immutable source material only
- No edits after ingestion except metadata repair logs
- Every derived claim should trace back here

### Layer B: Compiled Knowledge
- Canonical markdown pages for concepts, projects, decisions, architecture, and markets
- Aggressive deduplication
- Cross-linking required when two pages materially affect one another

### Layer C: Behavioral Memory
- Capture how the user prefers work to be done
- Store recurring taste, framing, correction, and quality patterns
- Use this layer to improve first drafts

### Layer D: Governing Rules
- Small files with stable rules only
- No bloated essays
- Prefer precise directives over motivational language

## 7. GPT Runtime Adaptation Rules

This system is adapted for a GPT agent that does not control its own base model or platform hooks.

Therefore:
- "Implement into the system" means durable memory plus future-run operating rules
- "Retroactive" means ingest everything accessible through exports, uploaded files, repo history, and connected tools
- "Automatic" means use the strongest available low-friction workflow, not fictional hidden access
- The model must clearly label verified fact, inference, claimed external evidence, and missing access

## 8. Correction Ledger Protocol

Every meaningful correction from the user should be evaluated into one of four destinations:
- Local page correction
- Project-wide correction
- Global directive
- User preference / style rule

Each correction entry should store:
- date
- original wrong assumption
- corrected state
- scope
- affected pages
- whether the rule is permanent

The system should prefer learning from corrections over repeating them.

## 9. Historical Backfill Protocol

When historical exports are available:
1. Ingest chronologically
2. Build timeline
3. Extract recurring projects and concepts
4. Mine decisions and pivots
5. Mine friction and repeated corrections
6. Promote stable patterns into directives or user-operating-model

If exports are not available, do not invent the past. Build forward and mark backfill as pending.

## 10. Health Check Protocol

Run periodic audits for:
- contradiction
- duplicate pages
- stale project framing
- orphaned decisions
- unresolved open loops
- repeated corrections not yet promoted

Only surface high-signal findings.

## 11. Plug-and-Play Deployment Sequence

### Phase A: Install
- create canonical folder structure
- create governing files
- create source index and correction ledger templates
- set user-facing default timezone to `America/Edmonton`
- define metadata schema for all ingested evidence

### Phase B: Backfill
- ingest available exports, uploads, repo history, and connected-tool evidence
- write immutable raw records
- checkpoint progress by source and date

### Phase C: Compile
- build or update canonical wiki pages
- generate directives, user patterns, and decision pages
- add cross-links and source references

### Phase D: Validate
- run contradiction, duplication, and drift checks
- promote repeated corrections into durable rules
- keep output quiet unless something materially matters

### Phase E: Activate
- continue forward in ambient mode
- update canonical pages instead of spawning duplicates
- treat each correction as a chance to permanently reduce future drift

## 12. Lazy-CEO Operating Contract

- No manual sorting if placement can be inferred safely
- No repeated prompting for already-known durable preferences
- No direct rewriting of raw evidence
- No bloated governance files
- No noisy dashboards or vanity reporting
- No silent elevation of weak or one-off preferences into permanent rules
- No broad context loading when targeted context is enough

## 13. 100/100 Quality Standard

This blueprint is only successful if it is:
- truthful about runtime limits
- useful without constant babysitting
- structured enough to persist across sessions
- quiet by default
- able to get better from corrections
- resistant to drift and duplication

## 14. Definitive Implementation Decision

This blueprint is adopted as the canonical Omni-Recall operating spec for this workspace memory.
Future runs should treat it as the preferred continuity architecture unless the user explicitly replaces it.
