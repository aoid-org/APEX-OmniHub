# Ingestion Rules

## What Gets Ingested

- User-uploaded files (exports, briefs, docs)
- Repo history accessible via `git log`
- GitHub PR/issue content via MCP tools
- Supabase project state via MCP tools
- Web research results when explicitly fetched

## What Does NOT Get Ingested

- Inaccessible account history (ChatGPT, Claude.ai, Gemini exports not provided)
- Email, Slack, Drive, Docs without explicit connector or export
- Anything not reachable in this session's tools

## Ingestion Protocol

1. Write raw file to `raw/historical_exports/` — immutable, never edit
2. Log the ingestion in `activity_logs/ingestion/YYYY-MM-DD-<source>.md`
3. Extract meaningful facts into canonical wiki pages
4. Update `state/checkpoints/current-status.md`
5. Mark any unavailable history as `backfill_pending`

## Metadata Schema for Raw Evidence

```
source: <filename or URL>
date_ingested: YYYY-MM-DD
type: export | upload | repo | tool | web
confidence: verified | inferred | claimed
backfill_coverage: <date range or "unknown">
```
