---
version: 1.0.0
last_audited: 2026-06-17
status: verified
---

# Python 3.10 Orchestrator Compatibility Fix — 2026-06-17

## Context

`ERRORS.md` captured release verification failures in GitHub Actions on Python 3.10.12 during `cd orchestrator && python -m pytest -q` collection.

## Root Cause

Two orchestrator modules used Python 3.11-only standard-library symbols while the orchestrator package declares Python `>=3.10` support:

- `enum.StrEnum` in `orchestrator/omniboard/schema.py`
- `datetime.UTC` in `orchestrator/security/guardian_fabric.py`

## Fix

- Replace `StrEnum` inheritance with `class X(str, Enum)` so enum values remain string-compatible on Python 3.10+.
- Replace `datetime.UTC` with `timezone.utc`.

## Validation Notes

- `python -m py_compile orchestrator/omniboard/schema.py orchestrator/security/guardian_fabric.py` passed on local Python 3.12.
- `ruff check` and `ruff format --check` passed for both touched files.
- Targeted pytest collection no longer reports the original `StrEnum` or `datetime.UTC` import errors, but this container does not have the complete orchestrator dependency set installed; collection stops later on a local `supabase` package import mismatch.
