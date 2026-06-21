#!/usr/bin/env python3
"""RSI evidence bundle builder.

CLI: python tools/rsi/build_evidence.py [--ci] [--base REF] [--head REF]
"""

# Prevent tools/rsi/ from shadowing stdlib 'types' when run as a script.
# sys and os are C-extension modules — safe to import before stdlib stabilizes.
import os as _os
import sys as _sys

_rsi_dir = _os.path.dirname(_os.path.abspath(__file__))
if _sys.path and _sys.path[0] == _rsi_dir:
    _sys.path.pop(0)
    _root = _os.path.abspath(_os.path.join(_rsi_dir, "..", ".."))
    if _root not in _sys.path:
        _sys.path.insert(0, _root)

import argparse
import json
import os
import subprocess
import sys
from datetime import UTC, datetime
from fnmatch import fnmatch
from pathlib import Path
from typing import Any

ARTIFACT_DIR = Path(os.getenv("RSI_ARTIFACT_DIR", "artifacts/rsi"))
INVENTORY_DIR = Path("inventory")
POLICY_FILE = Path("policy/rsi-policy.yaml")
SCHEMA_VERSION = "1.0.0"
MAX_DIFF_SUMMARY_CHARS = 2000
MAX_INVENTORY_CHARS = 500
DOCS_PATTERNS = ["*.md", "*.txt", "docs/**", "memory/omni-recall/docs/**", "memory/omni-recall/governance/**", "memory/omni-recall/reports/**", "memory/omni-recall/apex-dataroom/**", "*.rst", "*.adoc"]
FALLBACK_DIFF_REF = "HEAD~1"


def _run(cmd: list[str], capture: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(cmd, capture_output=capture, text=True, check=False)  # noqa: S603  # NOSONAR


def _load_policy_version() -> str:
    try:
        import yaml  # type: ignore[import-untyped]
        data = yaml.safe_load(POLICY_FILE.read_text(encoding="utf-8"))
        return str(data.get("policy_version", "unknown"))
    except Exception:
        return "unknown"


def _load_policy_patterns() -> tuple[list[str], list[str]]:
    """Return (protected_patterns, critical_patterns) from policy YAML."""
    try:
        import yaml  # type: ignore[import-untyped]
        data = yaml.safe_load(POLICY_FILE.read_text(encoding="utf-8"))
        protected = data.get("protected_paths", [])
        critical = data.get("critical_paths", [])
        return protected, critical
    except Exception:
        return [], []


def _is_match(path: str, pattern: str) -> bool:
    """Glob match supporting ** as single-segment wildcard."""
    normalized = pattern.replace("**", "*")
    return fnmatch(path, normalized) or fnmatch(path, pattern)


def _classify_path(
    path: str,
    protected_patterns: list[str],
    critical_patterns: list[str],
) -> str:
    if any(_is_match(path, p) for p in protected_patterns if not p.startswith("!")):
        return "protected"
    # Check critical patterns with negation support
    positive = [p for p in critical_patterns if not p.startswith("!")]
    negative = [p[1:] for p in critical_patterns if p.startswith("!")]
    if any(_is_match(path, p) for p in positive) and not any(
        _is_match(path, p) for p in negative
    ):
        return "critical"
    if any(fnmatch(path, pat.replace("**", "*")) for pat in DOCS_PATTERNS):
        return "docs-only"
    return "standard"


def _get_changed_files_ci(base_ref: str, head_ref: str) -> list[str]:
    result = _run(
        ["git", "diff", "--name-only", f"origin/{base_ref}...origin/{head_ref}"]
    )
    if result.returncode != 0:
        # Fallback: diff against local base
        result = _run(["git", "diff", "--name-only", f"origin/{base_ref}...HEAD"])
    if result.returncode != 0:
        result = _run(["git", "diff", FALLBACK_DIFF_REF, "--name-only"])
    return [p for p in result.stdout.strip().splitlines() if p]


def _get_changed_files_local(base_ref: str | None, head_ref: str | None) -> list[str]:
    if base_ref and head_ref:
        result = _run(["git", "diff", "--name-only", f"{base_ref}...{head_ref}"])
    elif base_ref:
        result = _run(["git", "diff", "--name-only", f"{base_ref}...HEAD"])
    else:
        result = _run(["git", "diff", FALLBACK_DIFF_REF, "--name-only"])
    return [p for p in result.stdout.strip().splitlines() if p]


def _get_pr_body() -> str:
    event_path = os.getenv("GITHUB_EVENT_PATH")
    if event_path and Path(event_path).exists():
        try:
            import json
            with open(event_path, "r", encoding="utf-8") as file_obj:
                event = json.load(file_obj)
            if "pull_request" in event:
                return event["pull_request"].get("body", "") or ""
        except Exception:
            pass
    local_path = ARTIFACT_DIR / "pr_body.txt"
    if local_path.exists():
        return local_path.read_text(encoding="utf-8")
    return ""

def _get_diff_stats(changed_files: list[str]) -> dict[str, int]:
    if not changed_files:
        return {"total_files_changed": 0, "insertions": 0, "deletions": 0}
    result = _run(["git", "diff", "--stat", FALLBACK_DIFF_REF])
    summary = result.stdout.splitlines()[-1] if result.stdout.strip() else ""
    insertions = 0
    deletions = 0
    for token in summary.split(","):
        parts = token.split()
        if len(parts) >= 2 and parts[0].isdigit():
            if "insertion" in parts[1]:
                insertions = int(parts[0])
            elif "deletion" in parts[1]:
                deletions = int(parts[0])
    return {
        "total_files_changed": len(changed_files),
        "insertions": insertions,
        "deletions": deletions,
    }


def _get_scoped_diff_summary(changed_files: list[str]) -> str:
    if not changed_files:
        return ""
    result = _run(["git", "diff", "--stat", FALLBACK_DIFF_REF, "--", *changed_files[:20]])
    summary = result.stdout[:MAX_DIFF_SUMMARY_CHARS]
    if len(result.stdout) > MAX_DIFF_SUMMARY_CHARS:
        summary = summary + "[TRUNCATED]"
    return summary


def _get_inventory_summary() -> str:
    meta_file = INVENTORY_DIR / "repo_meta.txt"
    if meta_file.exists():
        content = meta_file.read_text(encoding="utf-8")
    else:
        result = _run(["bash", "scripts/repo_inventory.sh"])
        content = result.stdout if result.returncode == 0 else "inventory unavailable"
    return content[:MAX_INVENTORY_CHARS]


def _build_candidate_test_plan(classified: dict[str, str]) -> list[str]:
    plan: list[str] = []
    if any(c == "protected" for c in classified.values()):
        plan.append("security-audit")
        plan.append("full-regression")
    if any(
        p.startswith(".github/workflows") for p in classified
    ):
        plan.append("workflow-syntax-check")
    if any(p.startswith("supabase/migrations") for p in classified):
        plan.append("migration-rollback-test")
    if any(p.startswith("orchestrator/") for p in classified):
        plan.append("orchestrator-unit-tests")
        plan.append("orchestrator-integration-tests")
    if any(p.startswith("src/") for p in classified):
        plan.append("frontend-unit-tests")
        plan.append("e2e-smoke")
    if any(c == "docs-only" for c in classified.values()) and not any(
        c != "docs-only" for c in classified.values()
    ):
        plan = ["docs-link-check"]
    return list(dict.fromkeys(plan))  # deduplicate preserving order


def _resolve_ci_context(
    generation_mode: str | None,
) -> tuple[list[str], str, str | None, str | None]:
    """Return (changed_files, mode, base_ref, head_ref) for a CI-triggered run."""
    env_base = os.getenv("GITHUB_BASE_REF", "")
    env_head = os.getenv("GITHUB_HEAD_REF", "")
    if env_base and env_head:
        files = _get_changed_files_ci(env_base, env_head)
        return files, generation_mode or "ci", env_base, env_head
    print(
        "WARNING: GITHUB_BASE_REF or GITHUB_HEAD_REF not set — "
        f"falling back to {FALLBACK_DIFF_REF} local diff",
        file=sys.stderr,
    )
    files = [p for p in _run(["git", "diff", FALLBACK_DIFF_REF, "--name-only"]).stdout.strip().splitlines() if p]
    return files, "local-fallback", None, None


def _resolve_local_context(
    base_ref: str | None,
    head_ref: str | None,
    generation_mode: str | None,
) -> tuple[list[str], str, str | None, str | None]:
    """Return (changed_files, mode, base_ref, head_ref) for a local or dispatch run."""
    if base_ref or head_ref:
        return _get_changed_files_local(base_ref, head_ref), generation_mode or "local", base_ref, head_ref
    if os.getenv("GITHUB_EVENT_NAME", "") == "workflow_dispatch":
        result = _run(["git", "log", "HEAD~3..HEAD", "--name-only", "--format="])
        files = [p for p in result.stdout.strip().splitlines() if p]
        return files, "manual", None, None
    files = [p for p in _run(["git", "diff", FALLBACK_DIFF_REF, "--name-only"]).stdout.strip().splitlines() if p]
    return files, "local", None, None


def build_evidence(
    ci_mode: bool = False,
    base_ref: str | None = None,
    head_ref: str | None = None,
    generation_mode: str | None = None,
) -> dict[str, Any]:
    """Build and return the RSI evidence bundle as a dict."""
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    INVENTORY_DIR.mkdir(parents=True, exist_ok=True)

    if ci_mode:
        changed_files, mode, b_ref, h_ref = _resolve_ci_context(generation_mode)
    else:
        changed_files, mode, b_ref, h_ref = _resolve_local_context(base_ref, head_ref, generation_mode)

    policy_version = _load_policy_version()
    protected_patterns, critical_patterns = _load_policy_patterns()

    classified: dict[str, str] = {}
    for path in changed_files:
        classified[path] = _classify_path(path, protected_patterns, critical_patterns)

    protected_hits = [p for p, cls in classified.items() if cls == "protected"]
    diff_stats = _get_diff_stats(changed_files)
    inventory_summary = _get_inventory_summary()

    sha_result = _run(["git", "rev-parse", "HEAD"])
    sha = sha_result.stdout.strip() if sha_result.returncode == 0 else ""

    repo_name_result = _run(["git", "rev-parse", "--show-toplevel"])
    repo_name = (
        Path(repo_name_result.stdout.strip()).name
        if repo_name_result.returncode == 0
        else os.getenv("GITHUB_REPOSITORY", "unknown")
    )

    pr_number_str = os.getenv("PR_NUMBER", "")
    pr_number: int | None = int(pr_number_str) if pr_number_str.isdigit() else None

    manifests_touched = [
        p for p in changed_files
        if Path(p).name in {
            "package.json", "package-lock.json", "bun.lock",
            "pyproject.toml", "requirements.txt", "requirements.lock",
        }
    ]
    workflows_touched = [
        p for p in changed_files if p.startswith(".github/workflows/")
    ]

    candidate_tests = _build_candidate_test_plan(classified)

    bundle: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "generation_mode": mode,
        "policy_version": policy_version,
        "repository": {
            "name": repo_name,
            "sha": sha,
            "pr_number": pr_number,
            "base_ref": b_ref,
            "head_ref": h_ref,
        },
        "changed_paths": changed_files,
        "classified_paths": classified,
        "protected_path_hits": protected_hits,
        "diff_stats": diff_stats,
        "scoped_diff_summary": _get_scoped_diff_summary(changed_files),
        "inventory_summary": inventory_summary,
        "manifests_touched": manifests_touched,
        "workflows_touched": workflows_touched,
        "candidate_test_plan": candidate_tests,
        "pr_body": _get_pr_body(),
    }

    out_path = ARTIFACT_DIR / "evidence.json"
    out_path.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
    print(f"Evidence bundle written to {out_path}", file=sys.stderr)
    return bundle


def main() -> int:
    ap = argparse.ArgumentParser(description="RSI evidence bundle builder")
    ap.add_argument("--ci", action="store_true", help="CI mode: use GITHUB_* env vars")
    ap.add_argument("--base", default=None, help="Base git ref (local mode)")
    ap.add_argument("--head", default=None, help="Head git ref (local mode)")
    args = ap.parse_args()

    try:
        build_evidence(ci_mode=args.ci, base_ref=args.base, head_ref=args.head)
        return 0
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:
        print(f"ERROR (unexpected): {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
