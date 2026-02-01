"""
Iron Law enforcement for physical actions.

Python port of apex-resilience/core/iron-law.ts deductive path verification.
Deterministic, no I/O. Any evidence collection must occur in activities.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class IronLawResult:
    status: str
    logic_delta: float
    reason: str | None = None


def _normalize_payload(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return json.loads(json.dumps(payload, sort_keys=True))
    except TypeError:
        # Fallback: coerce non-serializable values to string deterministically
        return json.loads(json.dumps(payload, sort_keys=True, default=lambda v: str(v)))


def compute_logic_delta(intent: dict[str, Any], target_state: dict[str, Any]) -> float:
    intent_norm = _normalize_payload(intent)
    target_norm = _normalize_payload(target_state)

    intent_keys = set(intent_norm.keys())
    target_keys = set(target_norm.keys())
    if not target_keys:
        return 0.0

    differing = 0
    for key in target_keys:
        if key not in intent_keys:
            differing += 1
            continue
        if intent_norm.get(key) != target_norm.get(key):
            differing += 1

    return differing / max(len(target_keys), 1)


def verify_deductive_path(
    intent: dict[str, Any], target_state: dict[str, Any], logic_delta_max: float
) -> IronLawResult:
    delta = compute_logic_delta(intent, target_state)

    if delta > logic_delta_max:
        return IronLawResult(
            status="REQUIRES_HUMAN_REVIEW",
            logic_delta=delta,
            reason=f"Logic delta {delta:.3f} exceeds threshold {logic_delta_max:.3f}",
        )

    return IronLawResult(status="APPROVED", logic_delta=delta)


def hash_intent(intent: dict[str, Any]) -> str:
    normalized = _normalize_payload(intent)
    payload = json.dumps(normalized, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()
