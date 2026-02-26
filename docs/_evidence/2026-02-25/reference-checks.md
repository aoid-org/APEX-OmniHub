# Reference Checks — Phase 0 Preflight

**Date:** 2026-02-25
**Command:** `rg -n "lint_aSpiral.txt|lint_extracted.txt|lint_final.txt|lint_utf8.txt|APEX Bible.zip|OMNILINK_APP_DEMO.webm" -S .`
**Scope:** Entire repository

---

## Search Results

### `lint_aSpiral.txt`
**Status:** NOT FOUND in repo | 0 references in codebase
**Action:** No file to delete. No references to clean.

### `lint_extracted.txt`
**Status:** NOT FOUND in repo | 0 references in codebase
**Action:** No file to delete. No references to clean.

### `lint_final.txt`
**Status:** NOT FOUND in repo | 0 references in codebase
**Action:** No file to delete. No references to clean.

### `lint_utf8.txt`
**Status:** NOT FOUND in repo | 0 references in codebase
**Action:** No file to delete. No references to clean.

### `APEX Bible.zip`
**Status:** EXISTS at repo root (32,203 bytes) | 0 references in codebase
**Grep output:** (no matches)
**Action (Phase 3):** Unreferenced binary artifact. Delete and add `*.zip` pattern to root `.gitignore`. The `.claude/skills/*.zip` files are separate skill packages and should be evaluated independently.

### `OMNILINK_APP_DEMO.webm`
**Status:** NOT FOUND as committed file | 3 references in `scripts/record_app_demo.ts`
**Grep output:**
```
scripts/record_app_demo.ts:100:    .filter(f => f.endsWith('.webm') && f !== 'OMNILINK_APP_DEMO.webm')
scripts/record_app_demo.ts:106:    const newPath = path.join(evidenceDir, 'OMNILINK_APP_DEMO.webm');
scripts/record_app_demo.ts:112:    const rootCopy = path.resolve(__dirname, '..', 'OMNILINK_APP_DEMO.webm');
```
**Analysis:** File is a runtime-generated artifact produced by `scripts/record_app_demo.ts`. It writes to `evidence/` (gitignored) and copies to project root. The file itself is not committed to the repo.
**Action (Phase 3):** Not a committed binary — no deletion needed. The `evidence/` directory is already gitignored. Add `*.webm` to `.gitignore` to prevent accidental commits of the root copy. References in `record_app_demo.ts` are valid (script generates the file).

---

## Additional Artifacts Found (not in original search targets)

### `apps/omnihub-site/lint_log*.txt`
**Files:** `lint_log.txt`, `lint_log_v2.txt`, `lint_log_v3.txt`
**Status:** Committed stale CI artifacts | 0 references in codebase
**Action (Phase 3):** Delete. Add `lint_log*.txt` pattern to `.gitignore` if not already covered.

---

## Summary Table

| File | Exists? | Refs | Disposition |
|------|---------|------|-------------|
| `lint_aSpiral.txt` | No | 0 | N/A |
| `lint_extracted.txt` | No | 0 | N/A |
| `lint_final.txt` | No | 0 | N/A |
| `lint_utf8.txt` | No | 0 | N/A |
| `APEX Bible.zip` | Yes (root) | 0 | Delete in Phase 3 |
| `OMNILINK_APP_DEMO.webm` | No (runtime) | 3 | Add *.webm to .gitignore |
| `apps/omnihub-site/lint_log.txt` | Yes | 0 | Delete in Phase 3 |
| `apps/omnihub-site/lint_log_v2.txt` | Yes | 0 | Delete in Phase 3 |
| `apps/omnihub-site/lint_log_v3.txt` | Yes | 0 | Delete in Phase 3 |

No STOP-3 conditions triggered. All targeted files either do not exist or have no unexpected references blocking deletion.
