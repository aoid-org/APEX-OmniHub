# apex-universal-sync-orchestrator

Normalizes external application JSON payloads into unified APEX-OmniHub state
vectors for OmniBoard application integration and onboarding — with full
violation reports in a single pass and deterministic `omni_id` generation.

## Install

Copy the skill package into your project's skills directory:

```bash
cp -r apex-universal-sync-orchestrator /path/to/project/.claude/skills/
```

That's the whole install — the sync engine is stdlib-only Python 3.

## Before / After

**Scenario:** an Integration Engineer is onboarding a Salesforce instance
into OmniBoard (application integration only — OmniBoard is never
client-facing).

**Before:** the engineer hand-maps `AccountName`, `AnnualRevenue`, and
`IsActive` to OmniHub fields, discovers at runtime that revenue arrived as a
string and the active flag as `"true"`, and fixes mapping bugs one failure at
a time across several sync attempts. Duplicate records appear because each
retry mints a new identifier.

**After:** the agent runs `scripts/sync_payload.py` against the payload and
the mapping schema. Every mapping violation is reported field-by-field in one
pass, types are coerced per schema (`"4200000"` → `4200000.0`, `"true"` →
`true`), optional fields fall back to schema defaults, and a deterministic
`omni_id` (`salesforce_20260610090000`) is produced before any state enters
OmniBoard — so re-syncs deduplicate cleanly.

## Usage

```bash
python3 scripts/sync_payload.py payload.json mapping_schema.json
```

Exit 0 prints the normalized state vector JSON on stdout. Exit 1 prints one
`FIELD_NAME: reason` line per violation on stderr. See
`references/payload-mapping-schema.md` for the schema contract.

## Evidence

- `scorecard.json` — lint, token ledger, and rubric score.
- `evals/trigger-eval.json` — 9 positive / 8 negative trigger queries.

---

Built and maintained by APEX Business Systems Ltd.
