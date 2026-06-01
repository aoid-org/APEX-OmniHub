#!/usr/bin/env python3
"""RSI deterministic policy evaluator.

CLI: python tools/rsi/policy_engine.py
Importable: PolicyEngine class with evaluate(evidence: dict) -> dict
"""

# Prevent tools/rsi/ from shadowing stdlib 'types' when run as a script.
import os as _os
import sys as _sys

_rsi_dir = _os.path.dirname(_os.path.abspath(__file__))
if _sys.path and _sys.path[0] == _rsi_dir:
    _sys.path.pop(0)
    _root = _os.path.abspath(_os.path.join(_rsi_dir, "..", ".."))
    if _root not in _sys.path:
        _sys.path.insert(0, _root)

import json
import os
import sys
from datetime import UTC, datetime
from fnmatch import fnmatch
from pathlib import Path
from typing import Any

ARTIFACT_DIR = Path(os.getenv("RSI_ARTIFACT_DIR", "artifacts/rsi"))
POLICY_FILE = Path(os.getenv("RSI_POLICY_FILE", "policy/rsi-policy.yaml"))
DEFAULT_MAX_FILES_WITHOUT_ESCALATION = 50
DOCS_EXTENSIONS = {".md", ".txt", ".rst", ".adoc"}
DOCS_PREFIXES = ("docs/",)


def _is_match(path: str, pattern: str) -> bool:
    normalized = pattern.replace("**", "*")
    return fnmatch(path, normalized) or fnmatch(path, pattern)


def _is_docs_only(path: str) -> bool:
    p = Path(path)
    if p.suffix in DOCS_EXTENSIONS:
        return True
    return any(str(path).startswith(prefix) for prefix in DOCS_PREFIXES)


class PolicyEngine:
    def __init__(self, policy_path: Path = POLICY_FILE) -> None:
        if not policy_path.exists():
            raise FileNotFoundError(
                f"RSI policy file not found: {policy_path}. "
                "Ensure policy/rsi-policy.yaml exists before running the policy engine."
            )
        try:
            import yaml  # type: ignore[import-untyped]
            raw = yaml.safe_load(policy_path.read_text(encoding="utf-8"))
        except Exception as exc:
            raise ValueError(
                f"RSI policy file is not valid YAML ({policy_path}): {exc}"
            ) from exc

        if not isinstance(raw, dict):
            raise ValueError(
                f"RSI policy file must be a YAML mapping, got {type(raw).__name__}"
            )

        self._policy: dict[str, Any] = raw
        self._protected_patterns: list[str] = self._policy.get("protected_paths", [])
        raw_critical: list[str] = self._policy.get("critical_paths", [])
        self._critical_positive = [p for p in raw_critical if not p.startswith("!")]
        self._critical_negative = [p[1:] for p in raw_critical if p.startswith("!")]
        self._max_files: int = int(
            self._policy.get(
                "max_files_without_escalation", DEFAULT_MAX_FILES_WITHOUT_ESCALATION
            )
        )
        self._policy_version: str = str(self._policy.get("policy_version", "unknown"))

    def _classify(self, path: str) -> str:
        if any(
            _is_match(path, p)
            for p in self._protected_patterns
            if not p.startswith("!")
        ):
            return "protected"
        if any(_is_match(path, p) for p in self._critical_positive) and not any(
            _is_match(path, p) for p in self._critical_negative
        ):
            return "critical"
        if _is_docs_only(path):
            return "docs-only"
        return "standard"

    def evaluate(self, evidence: dict[str, Any]) -> dict[str, Any]:
        changed_paths: list[str] = evidence.get("changed_paths", [])
        classified: dict[str, str] = {
            p: self._classify(p) for p in changed_paths
        }

        protected_hits = [p for p, cls in classified.items() if cls == "protected"]
        critical_hits = [p for p, cls in classified.items() if cls == "critical"]
        total = len(changed_paths)
        all_docs = total > 0 and all(cls == "docs-only" for cls in classified.values())

        # Decision rules in priority order
        if protected_hits:
            decision = "block"
            rationale = (
                f"Protected path(s) touched — hard block enforced: "
                f"{', '.join(protected_hits)}"
            )
        elif critical_hits:
            decision = "escalate"
            rationale = (
                f"Critical path(s) touched — manual review required: "
                f"{', '.join(critical_hits)}"
            )
        elif total > self._max_files:
            decision = "escalate"
            rationale = (
                f"Change set size ({total}) exceeds escalation threshold "
                f"({self._max_files})"
            )
        elif all_docs:
            decision = "allow"
            rationale = "All changed paths are documentation — auto-allow."
        else:
            decision = "allow"
            rationale = "No protected or critical paths touched, within size limit."

        model_usage_allowed = (
            decision == "escalate"
            and not protected_hits
            and bool(os.getenv("RSI_MODEL_ENABLED", ""))
        )

        required_tests = list(evidence.get("candidate_test_plan", []))
        if protected_hits:
            for t in ("security-audit", "full-regression"):
                if t not in required_tests:
                    required_tests.append(t)

        codeowners: list[str] = self._policy.get("recommended_reviewers", [])
        if protected_hits:
            security_reviewers: list[str] = self._policy.get(
                "security_reviewers", []
            )
            codeowners = list(dict.fromkeys(codeowners + security_reviewers))

        return {
            "decision": decision,
            "protected_path_hits": protected_hits,
            "critical_path_hits": critical_hits,
            "required_tests": required_tests,
            "recommended_reviewers": codeowners,
            "model_usage_allowed": model_usage_allowed,
            "rationale": rationale,
            "policy_version": self._policy_version,
            "checked_at": datetime.now(UTC).isoformat(),
        }


def run_policy_engine() -> int:
    evidence_path = ARTIFACT_DIR / "evidence.json"
    if not evidence_path.exists():
        print(
            f"ERROR: evidence file not found at {evidence_path}. "
            "Run build_evidence.py first.",
            file=sys.stderr,
        )
        return 1

    evidence = json.loads(evidence_path.read_text(encoding="utf-8"))

    try:
        engine = PolicyEngine()
    except (FileNotFoundError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

    result = engine.evaluate(evidence)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ARTIFACT_DIR / "policy_result.json"
    out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"Policy result written to {out_path}", file=sys.stderr)
    print(f"Policy decision: {result['decision']}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(run_policy_engine())
