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


def _evaluate_protected_evidence(body: str) -> dict[str, Any]:  # noqa: C901
    body_lower = body.lower()
    missing = []
    
    if "protected files touched" not in body_lower:
        missing.append("List of protected files touched")
    if "reason for touching production terraform" not in body_lower:
        missing.append("Reason for touching production Terraform")
    if "ops doc guard" not in body_lower:
        missing.append("Ops Doc Guard documentation confirmation")
    if "terraform/hcp plan status: passed" not in body_lower:
        if "terraform/hcp plan status: blocked with exact external reason" not in body_lower:
            missing.append("Terraform/HCP plan status")
    if "production routing flip status: explicitly approved" not in body_lower and "production routing flip status: deferred" not in body_lower:
        missing.append("Production routing flip status")
    if "user-shoes validation result: go" not in body_lower:
        if "user-shoes validation result: blocked" not in body_lower and "user-shoes validation result: no-go" not in body_lower:
            missing.append("User-shoes validation result")
    if "connect ai live validation result if in scope: go" not in body_lower and "byom / connect ai live validation result if in scope: go" not in body_lower:
        if "connect ai live validation result" not in body_lower and "byom / connect ai" not in body_lower:
            missing.append("BYOM / Connect AI live validation result")
    if "no sensitive credentials were exposed" not in body_lower:
        missing.append("Sensitive credentials confirmation")
    if "final recommendation: merge by repo owner" not in body_lower and "final recommendation: hold" not in body_lower:
        missing.append("Final recommendation")

    is_complete = len(missing) == 0
    
    is_no_go = "validation result: no-go" in body_lower
    is_blocked = "validation result: blocked" in body_lower or "plan status: blocked" in body_lower
    
    can_pass = False
    rationale = ""
    if not is_complete:
        rationale = "Evidence is incomplete. Missing or invalid: " + ", ".join(missing)
    elif is_no_go:
        rationale = "Evidence indicates NO-GO validation result."
    elif is_blocked:
        if "final recommendation: hold" in body_lower:
            rationale = "Evidence is BLOCKED but explicitly held by recommendation."
        elif "blocked with exact external reason" in body_lower and "final recommendation: merge by repo owner" in body_lower:
            can_pass = True
            rationale = "Evidence is complete and externally BLOCKED with valid recommendation."
        else:
            rationale = "Evidence is BLOCKED but missing external reason or valid recommendation."
    else:
        can_pass = True
        rationale = "Evidence is complete and validation is GO."

    return {
        "can_pass": can_pass,
        "is_complete": is_complete,
        "missing": missing,
        "rationale": rationale
    }

def _risk_from_decision(
    decision: str,
    protected_hits: list[str],
    changed_paths: list[str],
    classified_paths: dict[str, str],
) -> str:
    if decision == "block":
        return "critical"
    if decision == "escalate":
        if protected_hits:
            return "critical"
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
        pr_body = (evidence or {}).get("pr_body", "")
        if protected_hits and pr_body:
            ev_result = _evaluate_protected_evidence(pr_body)
            if ev_result["can_pass"]:
                final_decision = "escalate"
                rationale = "Protected paths touched. Evidence complete and passing. Ready for owner review."
            else:
                final_decision = "block"
                rationale = "Protected path block — deterministic rule. Evidence incomplete or failing: " + ev_result['rationale']
        else:
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

    out = {
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
    
    if final_decision == "escalate" and "Ready for owner review" in rationale:
        out["owner_review_status"] = "ready_for_owner_merge"
        out["approval_model"] = "repo_owner_manual_merge_is_final_approval"
        
    return out


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
