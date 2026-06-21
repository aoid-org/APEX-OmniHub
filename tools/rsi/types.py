"""Shared types, dataclasses, and constants for RSI governance modules."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

DecisionEnum = Literal["allow", "escalate", "block", "PASS_FOR_OWNER_REVIEW"]
RiskEnum = Literal["low", "medium", "high", "critical"]
PathClass = Literal["protected", "critical", "standard", "docs-only"]
ModelError = Literal[
    "TIMEOUT",
    "AUTH_FAILURE",
    "ENDPOINT_ERROR",
    "INVALID_JSON",
    "SCHEMA_INVALID",
    "UNKNOWN_ERROR",
]

MODEL_DECISION_ALLOWED: frozenset[str] = frozenset({"allow", "escalate"})
# "block" is explicitly excluded — model cannot override policy engine

REQUIRED_DECISION_FIELDS: list[str] = [
    "decision",
    "risk",
    "abort",
    "protected_path_hits",
    "changed_paths",
    "required_tests",
    "recommended_reviewers",
    "rationale",
    "policy_version",
    "deterministic_summary",
    "model_summary",
    "artifacts_generated",
]

REQUIRED_MODEL_FIELDS: list[str] = [
    "model_decision",
    "confidence",
    "risk_assessment",
    "rationale",
    "additional_tests",
    "additional_reviewers",
]


@dataclass
class DiffStats:
    total_files_changed: int = 0
    insertions: int = 0
    deletions: int = 0


@dataclass
class Repository:
    name: str = ""
    sha: str = ""
    pr_number: int | None = None
    base_ref: str | None = None
    head_ref: str | None = None


@dataclass
class EvidenceBundle:
    schema_version: str = "1.0.0"
    generated_at: str = ""
    generation_mode: str = "local"
    policy_version: str = ""
    repository: Repository = field(default_factory=Repository)
    changed_paths: list[str] = field(default_factory=list)
    classified_paths: dict[str, PathClass] = field(default_factory=dict)
    protected_path_hits: list[str] = field(default_factory=list)
    diff_stats: DiffStats = field(default_factory=DiffStats)
    scoped_diff_summary: str = ""
    inventory_summary: str = ""
    manifests_touched: list[str] = field(default_factory=list)
    workflows_touched: list[str] = field(default_factory=list)
    candidate_test_plan: list[str] = field(default_factory=list)


@dataclass
class PolicyResult:
    decision: DecisionEnum = "allow"
    protected_path_hits: list[str] = field(default_factory=list)
    critical_path_hits: list[str] = field(default_factory=list)
    required_tests: list[str] = field(default_factory=list)
    recommended_reviewers: list[str] = field(default_factory=list)
    model_usage_allowed: bool = False
    rationale: str = ""
    policy_version: str = ""
    checked_at: str = ""


@dataclass
class ModelResult:
    model_available: bool = True
    error: ModelError | None = None
    model_decision: Literal["allow", "escalate"] | None = None
    confidence: Literal["low", "medium", "high"] | None = None
    risk_assessment: Literal["low", "medium", "high"] | None = None
    rationale: str | None = None
    additional_tests: list[str] = field(default_factory=list)
    additional_reviewers: list[str] = field(default_factory=list)


@dataclass
class DeterministicSummary:
    decision: DecisionEnum = "allow"
    protected_path_hits: list[str] = field(default_factory=list)
    critical_path_hits: list[str] = field(default_factory=list)
    model_usage_allowed: bool = False
    policy_version: str = ""


@dataclass
class ModelSummary:
    available: bool = False
    model_decision: Literal["allow", "escalate"] | None = None
    confidence: Literal["low", "medium", "high"] | None = None
    risk_assessment: Literal["low", "medium", "high"] | None = None
    error: str | None = None


@dataclass
class FinalDecision:
    decision: DecisionEnum = "allow"
    risk: RiskEnum = "low"
    abort: bool = False
    protected_path_hits: list[str] = field(default_factory=list)
    changed_paths: list[str] = field(default_factory=list)
    required_tests: list[str] = field(default_factory=list)
    recommended_reviewers: list[str] = field(default_factory=list)
    rationale: str = ""
    policy_version: str = ""
    deterministic_summary: DeterministicSummary = field(default_factory=DeterministicSummary)
    model_summary: ModelSummary | None = None
    artifacts_generated: list[str] = field(default_factory=list)
    approval_model: str | None = None
    final_approval_event: str | None = None
    notes: list[str] | None = None
