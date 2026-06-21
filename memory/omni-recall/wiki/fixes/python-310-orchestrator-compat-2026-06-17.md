---
version: 1.0.0
last_audited: 2026-06-17
status: verified
---

# Python 3.10 Orchestrator Compatibility Fix — 2026-06-17

> **Superseded 2026-06-21.** Release CI now pins Python 3.11 (see RFC_2026_06_19_RELEASE_CI_PYTHON_VERSION.md). The Python 3.10 compatibility shim is no longer needed for CI — the pin is the canonical fix.

## Context

`ERRORS.md` captured release verification failures in GitHub Actions on Python 3.10.12 during `cd orchestrator && python -m pytest -q` collection.

## Root Cause

The failing CI log included Python 3.11-only standard-library symbols while the orchestrator package declares Python `>=3.10` support. The safe, non-protected code change is limited to `enum.StrEnum` in `orchestrator/omniboard/schema.py`.

`orchestrator/security/guardian_fabric.py` is RSI-protected and must remain untouched; its `datetime.UTC` compatibility is handled by the existing orchestrator-local `sitecustomize.py` shim.

## Fix

- Replace `StrEnum` inheritance with `class X(str, Enum)` so enum values remain string-compatible on Python 3.10+.
- Do not touch protected `orchestrator/security/**` files; rely on the existing `sitecustomize.py` UTC alias shim for `datetime.UTC` on Python 3.10.

## Validation Notes

- `python -m py_compile orchestrator/omniboard/schema.py orchestrator/sitecustomize.py` passed locally.
- `ruff check` and `ruff format --check` passed for the non-protected touched orchestrator file.
- RSI governance must remain green by keeping `orchestrator/security/guardian_fabric.py` identical to the base branch.
