"""APEX proprietary execution envelope and W3C trace helpers."""

from __future__ import annotations

import hashlib
import json
import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

UTC = timezone.utc

APEX_EXECUTION_ENVELOPE_SCHEMA_VERSION = "apex.envelope.v1"
APEX_POLICY_VERSION = "apex.policy.v1"
_TRACEPARENT_RE = re.compile(r"^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$")
_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def canonical_json(value: Any) -> str:
    """Return canonical JSON for deterministic hashing across runtimes."""
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def sha256_hex(value: str) -> str:
    """Return a full SHA-256 hex digest without third-party dependencies."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class ApexTraceContext:
    traceparent: str
    trace_id: str
    parent_id: str
    tracestate: str | None = None


@dataclass(frozen=True)
class ApexExecutionEnvelope:
    trace_id: str
    correlation_id: str
    idempotency_key: str
    intent_hash: str
    attempt: int
    stale_after: str
    actor_id: str
    device_id: str
    policy_version: str
    compensation_ref: str | None
    schema_version: str = APEX_EXECUTION_ENVELOPE_SCHEMA_VERSION

    @classmethod
    def parse(cls, value: dict[str, Any]) -> ApexExecutionEnvelope:
        """Parse deterministically; perform validation only and no side effects."""
        required = (
            "trace_id",
            "correlation_id",
            "idempotency_key",
            "intent_hash",
            "stale_after",
            "actor_id",
            "device_id",
            "policy_version",
            "schema_version",
        )
        for field in required:
            if not isinstance(value.get(field), str) or not value[field]:
                raise ValueError(f"apex_envelope_invalid_{field}")
        if value["schema_version"] != APEX_EXECUTION_ENVELOPE_SCHEMA_VERSION:
            raise ValueError("apex_envelope_schema_version_unsupported")
        if not isinstance(value.get("attempt"), int) or value["attempt"] < 1:
            raise ValueError("apex_envelope_invalid_attempt")
        return cls(
            trace_id=value["trace_id"],
            correlation_id=value["correlation_id"],
            idempotency_key=value["idempotency_key"],
            intent_hash=value["intent_hash"],
            attempt=value["attempt"],
            stale_after=value["stale_after"],
            actor_id=value["actor_id"],
            device_id=value["device_id"],
            policy_version=value["policy_version"],
            compensation_ref=value.get("compensation_ref"),
            schema_version=value["schema_version"],
        )

    def assert_fresh(self, now: datetime | None = None) -> None:
        current = now or datetime.now(UTC)
        stale_at = datetime.fromisoformat(self.stale_after.replace("Z", "+00:00"))
        if stale_at <= current:
            raise ValueError("apex_stale_event")

    def log_fields(self, outcome: str, **extra: Any) -> dict[str, Any]:
        fields = {
            "trace_id": self.trace_id,
            "correlation_id": self.correlation_id,
            "idempotency_key": self.idempotency_key,
            "intent_hash": self.intent_hash,
            "actor_id": self.actor_id,
            "device_id": self.device_id,
            "policy_version": self.policy_version,
            "compensation_ref": self.compensation_ref,
            "outcome": outcome,
        }
        fields.update(extra)
        return fields


def derive_intent_hash(
    actor_id: str, device_id: str, action: str, resource: str, payload: Any = None
) -> str:
    return sha256_hex(
        canonical_json(
            {
                "actor_id": actor_id,
                "device_id": device_id,
                "action": action,
                "resource": resource,
                "payload": payload,
            }
        )
    )


def create_execution_envelope(
    *,
    actor_id: str,
    device_id: str,
    action: str,
    resource: str,
    payload: Any = None,
    stale_after: str,
    attempt: int = 1,
    trace_id: str | None = None,
    correlation_id: str | None = None,
    policy_version: str = APEX_POLICY_VERSION,
    compensation_ref: str | None = None,
) -> ApexExecutionEnvelope:
    intent_hash = derive_intent_hash(actor_id, device_id, action, resource, payload)
    corr_seed = sha256_hex(
        canonical_json(
            {
                "actor_id": actor_id,
                "action": action,
                "resource": resource,
                "intent_hash": intent_hash,
            }
        )
    )
    return ApexExecutionEnvelope(
        trace_id=trace_id or secrets.token_hex(16),
        correlation_id=correlation_id or f"apex-corr-{corr_seed[:32]}",
        idempotency_key=f"apex-idem-{intent_hash[:48]}",
        intent_hash=intent_hash,
        attempt=attempt,
        stale_after=stale_after,
        actor_id=actor_id,
        device_id=device_id,
        policy_version=policy_version,
        compensation_ref=compensation_ref,
    )


def assert_mutation_envelope(
    method: str, value: dict[str, Any], now: datetime | None = None
) -> ApexExecutionEnvelope | None:
    if method.upper() not in _MUTATING_METHODS:
        return None
    envelope = ApexExecutionEnvelope.parse(value)
    envelope.assert_fresh(now)
    return envelope


def parse_trace_context(headers: dict[str, str]) -> ApexTraceContext | None:
    traceparent = headers.get("traceparent")
    if not traceparent:
        return None
    match = _TRACEPARENT_RE.match(traceparent)
    if not match or match.group(1) == "0" * 32 or match.group(2) == "0" * 16:
        return None
    return ApexTraceContext(
        traceparent=traceparent,
        trace_id=match.group(1),
        parent_id=match.group(2),
        tracestate=headers.get("tracestate"),
    )


def continue_trace_context(existing: ApexTraceContext | None = None) -> ApexTraceContext:
    trace_id = existing.trace_id if existing else secrets.token_hex(16)
    parent_id = secrets.token_hex(8)
    return ApexTraceContext(
        traceparent=f"00-{trace_id}-{parent_id}-01",
        trace_id=trace_id,
        parent_id=parent_id,
        tracestate=existing.tracestate if existing else None,
    )
