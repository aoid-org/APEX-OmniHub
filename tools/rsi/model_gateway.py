#!/usr/bin/env python3
"""RSI hosted-model advisory gateway.

Runs ONLY when policy engine says model_usage_allowed == true.
Fail-closed on all error conditions — never crashes the pipeline.
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
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

ARTIFACT_DIR = Path(os.getenv("RSI_ARTIFACT_DIR", "artifacts/rsi"))
MODEL_TIMEOUT_SECONDS = 30
MAX_RATIONALE_CHARS = 1000
MAX_ADDITIONAL_ITEMS = 20

# Fields the model response must include
REQUIRED_MODEL_FIELDS = [
    "model_decision",
    "confidence",
    "risk_assessment",
    "rationale",
    "additional_tests",
    "additional_reviewers",
]
VALID_MODEL_DECISIONS = {"allow", "escalate"}
VALID_CONFIDENCE = {"low", "medium", "high"}
VALID_RISK = {"low", "medium", "high"}

_ERROR_STATE_TEMPLATE: dict[str, Any] = {
    "model_available": False,
    "error": None,
    "model_decision": None,
    "confidence": None,
    "risk_assessment": None,
    "rationale": None,
    "additional_tests": [],
    "additional_reviewers": [],
}


def _error_result(code: str) -> dict[str, Any]:
    result = dict(_ERROR_STATE_TEMPLATE)
    result["error"] = code
    return result


def _build_request_payload(evidence: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    """Build the minimal evidence subset sent to the model — never send full diff."""
    return {
        "changed_paths": evidence.get("changed_paths", []),
        "classified_paths": evidence.get("classified_paths", {}),
        "critical_path_hits": policy.get("critical_path_hits", []),
        "protected_path_hits": policy.get("protected_path_hits", []),
        "diff_stats": evidence.get("diff_stats", {}),
        "candidate_test_plan": evidence.get("candidate_test_plan", []),
        "policy_decision": policy.get("decision"),
        "policy_rationale": policy.get("rationale", ""),
        "repository": {
            "name": evidence.get("repository", {}).get("name", ""),
            "pr_number": evidence.get("repository", {}).get("pr_number"),
        },
    }


def _validate_model_response(data: dict[str, Any]) -> str | None:
    """Return error code string if invalid, else None."""
    missing = [f for f in REQUIRED_MODEL_FIELDS if f not in data]
    if missing:
        return "SCHEMA_INVALID"

    if data["model_decision"] not in VALID_MODEL_DECISIONS:
        # model cannot return "block"
        return "SCHEMA_INVALID"

    if data["confidence"] not in VALID_CONFIDENCE:
        return "SCHEMA_INVALID"

    if data["risk_assessment"] not in VALID_RISK:
        return "SCHEMA_INVALID"

    rationale = data.get("rationale") or ""
    if len(str(rationale)) > MAX_RATIONALE_CHARS:
        return "SCHEMA_INVALID"

    if not isinstance(data.get("additional_tests"), list):
        return "SCHEMA_INVALID"

    if not isinstance(data.get("additional_reviewers"), list):
        return "SCHEMA_INVALID"

    return None


def _require_https_endpoint(endpoint: str) -> None:
    """Reject non-HTTPS endpoints — prevents credential exposure and SSRF via cleartext."""
    parsed = urlparse(endpoint)
    if parsed.scheme != "https":
        raise ValueError(
            f"RSI_MODEL_ENDPOINT must use https://, got scheme: {parsed.scheme!r}. "
            "HTTP endpoints are not permitted."
        )
    if not parsed.netloc:
        raise ValueError("RSI_MODEL_ENDPOINT must include a valid hostname.")


def _call_model(  # noqa: C901
    endpoint: str,
    api_key: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    _require_https_endpoint(endpoint)
    system_prompt = (
        "You are a release safety reviewer. Evaluate the following PR evidence "
        "and return ONLY a JSON object matching the schema below. "
        "Do not include markdown, explanation, or preamble.\n\n"
        'Schema: {"model_decision": "allow"|"escalate", "confidence": "low"|"medium"|"high", '
        '"risk_assessment": "low"|"medium"|"high", "rationale": "<string max 500 chars>", '
        '"additional_tests": ["<string>", ...], "additional_reviewers": ["<string>", ...]}'
    )
    request_body = {
        "model": os.getenv("RSI_MODEL_NAME", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload)},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    body_bytes = json.dumps(request_body).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    req = urllib.request.Request(endpoint, data=body_bytes, headers=headers, method="POST")  # noqa: S310

    try:
        with urllib.request.urlopen(req, timeout=MODEL_TIMEOUT_SECONDS) as resp:  # noqa: S310  # NOSONAR
            raw = resp.read().decode("utf-8")
    except TimeoutError:
        return _error_result("TIMEOUT")
    except urllib.error.HTTPError as exc:
        if exc.code in (401, 403):
            return _error_result("AUTH_FAILURE")
        return _error_result("ENDPOINT_ERROR")
    except urllib.error.URLError:
        return _error_result("ENDPOINT_ERROR")
    except Exception:
        return _error_result("UNKNOWN_ERROR")

    try:
        outer = json.loads(raw)
    except json.JSONDecodeError:
        return _error_result("INVALID_JSON")

    # Handle OpenAI-compatible response wrapper
    if "choices" in outer:
        try:
            content = outer["choices"][0]["message"]["content"]
            parsed = json.loads(content)
        except (KeyError, IndexError, json.JSONDecodeError):
            return _error_result("INVALID_JSON")
    elif all(f in outer for f in REQUIRED_MODEL_FIELDS):
        parsed = outer
    else:
        return _error_result("INVALID_JSON")

    err = _validate_model_response(parsed)
    if err:
        return _error_result(err)

    return {
        "model_available": True,
        "error": None,
        "model_decision": parsed["model_decision"],
        "confidence": parsed["confidence"],
        "risk_assessment": parsed["risk_assessment"],
        "rationale": str(parsed["rationale"])[:MAX_RATIONALE_CHARS],
        "additional_tests": list(parsed["additional_tests"])[:MAX_ADDITIONAL_ITEMS],
        "additional_reviewers": list(parsed["additional_reviewers"])[:MAX_ADDITIONAL_ITEMS],
    }


def run_model_gateway() -> int:
    # rsi:dry mode explicitly disables model calls
    if os.getenv("RSI_DRY_RUN", ""):
        print("RSI_DRY_RUN set — model gateway skipped.", file=sys.stderr)
        return 0

    model_enabled = os.getenv("RSI_MODEL_ENABLED", "")
    if not model_enabled:
        print("RSI_MODEL_ENABLED not set — model gateway disabled.", file=sys.stderr)
        return 0

    policy_path = ARTIFACT_DIR / "policy_result.json"
    evidence_path = ARTIFACT_DIR / "evidence.json"

    for path in (policy_path, evidence_path):
        if not path.exists():
            print(f"ERROR: required artifact not found: {path}", file=sys.stderr)
            return 1

    policy = json.loads(policy_path.read_text(encoding="utf-8"))
    evidence = json.loads(evidence_path.read_text(encoding="utf-8"))

    if not policy.get("model_usage_allowed"):
        print(
            "model_usage_allowed == false in policy_result — gateway skipped.",
            file=sys.stderr,
        )
        return 0

    endpoint = os.getenv("RSI_MODEL_ENDPOINT", "").rstrip("/")
    api_key = os.getenv("RSI_MODEL_API_KEY", "")
    if not endpoint or not api_key:
        print(
            "RSI_MODEL_ENDPOINT or RSI_MODEL_API_KEY not configured — gateway skipped.",
            file=sys.stderr,
        )
        return 0

    try:
        _require_https_endpoint(endpoint)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        result = _error_result("UNKNOWN_ERROR")
        out_path = ARTIFACT_DIR / "model_result.json"
        out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return 0

    payload = _build_request_payload(evidence, policy)
    result = _call_model(endpoint, api_key, payload)

    out_path = ARTIFACT_DIR / "model_result.json"
    out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(
        f"Model result written to {out_path} (available={result.get('model_available')})",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(run_model_gateway())
