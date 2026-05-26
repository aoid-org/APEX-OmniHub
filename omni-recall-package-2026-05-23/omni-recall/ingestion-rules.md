# Ingestion Rules
**Version:** 1.1.0 | **Date:** 2026-05-26 | **Author:** Lead AI Co-Founder | **Status:** Audited & Active

**Purpose:** Deterministic rules for adding new evidence into Omni-Recall without creating drift.

## Source Priority

1. **User Directives:** User-uploaded files and explicit user statements (highest priority).
2. **Session Verification:** Repo and tool evidence gathered in-session.
3. **Platform API:** Connected-system evidence obtained through approved tools (GitHub, Supabase).
4. **Third-Party Claims:** Claimed external evidence, clearly labeled as claimed until verified.

## Required Metadata

Every ingested record should include, when available:
- **Date:** ISO format timestamp.
- **Source:** Direct URL, file path, or API origin.
- **Type:** e.g., git commit, database schema, user statement.
- **Project:** target project (e.g., `APEX-OmniHub`, `PhysiOmni`).
- **Context:** Brief sentence on current operating status.
- **Entities:** UUIDs, project refs, or usernames.
- **Verification Status:** `verified`, `inferred`, or `unverified`.

## Placement Rules

All records must be saved within the `omni-recall-package-2026-05-23/omni-recall/` folder:
- Raw evidence goes under `raw/`
- Canonical knowledge goes under `wiki/`
- User preference and behavior patterns go under `wiki/user_patterns/`
- Corrections go under `wiki/corrections/`
- Run notes and status updates go under `state/checkpoints/` or `logs/`

## Hard Rules

- **No Style Refactoring:** Do not rewrite raw evidence to improve style.
- **No Duplicate Sources:** Do not ingest duplicate source records without noting supersession.
- **No Taste Elevation:** Do not promote temporary taste into durable preference without repeated evidence.
- **No Incomplete Claims:** Do not mark historical backfill complete unless accessible evidence actually covers it.
