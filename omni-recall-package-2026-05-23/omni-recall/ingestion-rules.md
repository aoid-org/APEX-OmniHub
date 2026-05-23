# Ingestion Rules

Purpose: deterministic rules for adding new evidence into Omni-Recall without creating drift.

## Source Priority

1. User-uploaded files and explicit user statements
2. Repo and tool evidence gathered in-session
3. Connected-system evidence obtained through approved tools
4. Claimed external evidence, clearly labeled as claimed until verified

## Required Metadata

Every ingested record should include, when available:
- date
- source
- type
- project
- context
- entities
- verification status

## Placement Rules

- Raw evidence goes under `/raw/...`
- Canonical knowledge goes under `/wiki/...`
- User preference and behavior patterns go under `/wiki/user_patterns/...`
- Corrections go under `/wiki/corrections/...`
- Run notes go under `/logs/...`

## Hard Rules

- Do not rewrite raw evidence to improve style
- Do not ingest duplicate source records without noting supersession
- Do not promote temporary taste into durable preference without repeated evidence
- Do not mark historical backfill complete unless accessible evidence actually covers it
