#!/usr/bin/env python3
"""RSI final decision combiner.

Reads policy_result.json + model_result.json (if present).
Writes decision.json and exits with code 0 (allow/escalate) or 1 (block/abort).
Deterministic policy result ALWAYS takes precedence over model advisory.
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
from pathlib import Path
from typing import Any

ARTIFACT_DIR = Path(os.getenv("RSI_ARTIFACT_DIR", "artifacts/rsi"))
MAX_REQUIRED_TESTS = 20
MAX_RECOMMENDED_REVIEWERS = 10


def _risk_from_decision(
    decision: str,
    protected_hits: list[str],
    changed_paths: list[str],
    classified_paths: dict[str, str],
) -> str:
    if decision == "block":
        return "critical"
    if decision == "escalate":
        return "high"
    # decision == "allow"
    if protected_hits:
        return "critical"  # defensive — should never occur with allow
    if any(cls != "docs-only" for cls in classified_paths.values()):
        return "medium" if changed_paths else "low"
    return "low"


def _merge_unique(base: list[str], extra: list[str], limit: int) -> list[str]:
    seen: dict[str, None] = {}
    for item in base + extra:
        seen[item] = None
    return list(seen.keys())[:limit]


def combine(
    policy: dict[str, Any],
    model: dict[str, Any] | None,
    evidence: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Apply combination rules and return final decision dict."""
    det_decision: str = policy["decision"]
    protected_hits: list[str] = policy.get("protected_path_hits", [])
    critical_hits: list[str] = policy.get("critical_path_hits", [])
    policy_version: str = policy.get("policy_version", "unknown")
    model_usage_allowed: bool = policy.get("model_usage_allowed", False)

    changed_paths: list[str] = (evidence or {}).get("changed_paths", [])
    classified_paths: dict[str, str] = (evidence or {}).get("classified_paths", {})

    deterministic_summary = {
        "decision": det_decision,
        "protected_path_hits": protected_hits,
        "critical_path_hits": critical_hits,
        "model_usage_allowed": model_usage_allowed,
        "policy_version": policy_version,
    }

    # Build model_summary
    if model is not None:
        model_summary: dict[str, Any] | None = {
            "available": model.get("model_available", False),
            "model_decision": model.get("model_decision"),
            "confidence": model.get("confidence"),
            "risk_assessment": model.get("risk_assessment"),
            "error": model.get("error"),
        }
        model_available = model.get("model_available", False)
        model_decision_val: str | None = model.get("model_decision")
    else:
        model_summary = None
        model_available = False
        model_decision_val = None

    # Combination rules (deterministic ALWAYS wins)
    if det_decision == "block":
        final_decision = "block"
        rationale = policy.get("rationale", "Protected path block — deterministic rule.")
    elif det_decision == "escalate" and not model_available:
        # Escalation without model advisory: allow merge but flag for manual review.
        # Failing closed here would deadlock: workflow PRs touching .github/workflows/**
        # would block themselves, making the RSI gate unresolvable without a model.
        final_decision = "escalate"
        rationale = (
            policy.get("rationale", "Critical path touched.") +
            " [Model advisory not configured — proceeding with escalate; human review required.]"
        )
    elif det_decision == "escalate" and model_available:
        # Model can inform escalate but cannot downgrade to allow
        final_decision = "escalate"
        rationale = (
            f"Policy escalation with model advisory "
            f"(model={model_decision_val}, policy=escalate)."
        )
    else:
        # det_decision == "allow" — model not consulted
        final_decision = "allow"
        rationale = policy.get("rationale", "No policy violations detected.")

    # abort=True ONLY on hard block — escalate requires human review, not pipeline abort.
    abort = final_decision == "block"

    risk = _risk_from_decision(
        final_decision, protected_hits, changed_paths, classified_paths
    )

    policy_tests: list[str] = policy.get("required_tests", [])
    model_tests: list[str] = (model or {}).get("additional_tests", [])
    required_tests = _merge_unique(policy_tests, model_tests, MAX_REQUIRED_TESTS)

    policy_reviewers: list[str] = policy.get("recommended_reviewers", [])
    model_reviewers: list[str] = (model or {}).get("additional_reviewers", [])
    recommended_reviewers = _merge_unique(
        policy_reviewers, model_reviewers, MAX_RECOMMENDED_REVIEWERS
    )

    artifacts = [
        str(ARTIFACT_DIR / "evidence.json"),
        str(ARTIFACT_DIR / "policy_result.json"),
        str(ARTIFACT_DIR / "decision.json"),
    ]
    if model is not None:
        artifacts.insert(2, str(ARTIFACT_DIR / "model_result.json"))

    return {
        "decision": final_decision,
        "risk": risk,
        "abort": abort,
        "protected_path_hits": protected_hits,
        "changed_paths": changed_paths,
        "required_tests": required_tests,
        "recommended_reviewers": recommended_reviewers,
        "rationale": rationale,
        "policy_version": policy_version,
        "deterministic_summary": deterministic_summary,
        "model_summary": model_summary,
        "artifacts_generated": artifacts,
    }


def run_decision() -> int:
    policy_path = ARTIFACT_DIR / "policy_result.json"
    if not policy_path.exists():
        print(
            f"ERROR: policy_result.json not found at {policy_path}. "
            "Run policy_engine.py first.",
            file=sys.stderr,
        )
        return 1

    policy = json.loads(policy_path.read_text(encoding="utf-8"))

    model: dict[str, Any] | None = None
    model_path = ARTIFACT_DIR / "model_result.json"
    if model_path.exists():
        model = json.loads(model_path.read_text(encoding="utf-8"))

    evidence: dict[str, Any] | None = None
    evidence_path = ARTIFACT_DIR / "evidence.json"
    if evidence_path.exists():
        evidence = json.loads(evidence_path.read_text(encoding="utf-8"))

    result = combine(policy, model, evidence)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = ARTIFACT_DIR / "decision.json"
    out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(f"Decision written to {out_path}", file=sys.stderr)
    print(
        f"FINAL DECISION: {result['decision'].upper()} | "
        f"risk={result['risk']} | abort={result['abort']}",
        file=sys.stderr,
    )

    if result["abort"]:
        print(
            f"RSI GATE BLOCKED: {result['rationale']}",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(run_decision())
