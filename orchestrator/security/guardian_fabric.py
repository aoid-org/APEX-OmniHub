"""Proprietary Guardian policy-decision fabric."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

from models.execution_envelope import ApexExecutionEnvelope

Decision = Literal["allow", "deny"]


@dataclass(frozen=True)
class GuardianPolicyRule:
    id: str
    effect: Decision
    reason_code: str
    policy_version: str
    actions: tuple[str, ...] = ()
    resources: tuple[str, ...] = ()
    required_context: tuple[str, ...] = ()
    allowed_device_ids: tuple[str, ...] = ()


@dataclass(frozen=True)
class GuardianPolicyDecisionRecord:
    principal: str
    action: str
    resource: str
    context: dict[str, Any]
    decision: Decision
    determining_policy_id: str
    reason_code: str
    policy_version: str
    trace_id: str
    correlation_id: str
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def _decision(
    base: dict[str, Any],
    *,
    decision: Decision,
    determining_policy_id: str,
    reason_code: str,
    policy_version: str,
) -> GuardianPolicyDecisionRecord:
    return GuardianPolicyDecisionRecord(
        **base,
        decision=decision,
        determining_policy_id=determining_policy_id,
        reason_code=reason_code,
        policy_version=policy_version,
    )


def _rule_matches_scope(rule: GuardianPolicyRule, *, action: str, resource: str) -> bool:
    action_matches = not rule.actions or action in rule.actions
    resource_matches = not rule.resources or resource in rule.resources
    return action_matches and resource_matches


def _evaluate_matching_rule(
    rule: GuardianPolicyRule,
    *,
    base: dict[str, Any],
    context: dict[str, Any],
    envelope: ApexExecutionEnvelope,
) -> GuardianPolicyDecisionRecord:
    if any(context.get(key) is None for key in rule.required_context):
        return _decision(
            base,
            decision="deny",
            determining_policy_id=rule.id,
            reason_code="MISSING_CONTEXT",
            policy_version=rule.policy_version,
        )
    if rule.allowed_device_ids and envelope.device_id not in rule.allowed_device_ids:
        return _decision(
            base,
            decision="deny",
            determining_policy_id=rule.id,
            reason_code="WRONG_DEVICE",
            policy_version=rule.policy_version,
        )
    return _decision(
        base,
        decision=rule.effect,
        determining_policy_id=rule.id,
        reason_code=rule.reason_code,
        policy_version=rule.policy_version,
    )


def evaluate_guardian_policy(
    *,
    principal: str,
    action: str,
    resource: str,
    context: dict[str, Any],
    envelope: ApexExecutionEnvelope,
    rules: tuple[GuardianPolicyRule, ...],
    current_policy_version: str | None = None,
    now: datetime | None = None,
) -> GuardianPolicyDecisionRecord:
    """Evaluate privileged actions with deterministic rule ordering and explainable denies."""
    current = now or datetime.now(timezone.utc)
    base = {
        "principal": principal,
        "action": action,
        "resource": resource,
        "context": context,
        "trace_id": envelope.trace_id,
        "correlation_id": envelope.correlation_id,
    }
    if current_policy_version and envelope.policy_version != current_policy_version:
        return _decision(
            base,
            decision="deny",
            determining_policy_id="apex.guardian.stale_policy_version",
            reason_code="STALE_POLICY_VERSION",
            policy_version=current_policy_version,
        )
    try:
        envelope.assert_fresh(current)
    except ValueError:
        return _decision(
            base,
            decision="deny",
            determining_policy_id="apex.guardian.stale_event",
            reason_code="STALE_EVENT",
            policy_version=envelope.policy_version,
        )
    for rule in sorted(rules, key=lambda item: item.id):
        if _rule_matches_scope(rule, action=action, resource=resource):
            return _evaluate_matching_rule(rule, base=base, context=context, envelope=envelope)
    return _decision(
        base,
        decision="deny",
        determining_policy_id="apex.guardian.default_deny",
        reason_code="NO_MATCHING_POLICY",
        policy_version=envelope.policy_version,
    )
