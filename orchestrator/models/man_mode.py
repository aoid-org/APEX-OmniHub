"""MAN Mode (Manual-Authorization-Needed) domain models.

This module defines the core data structures for the human-in-the-loop
safety system that gates high-risk agent actions.
"""

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class ManLane(str, Enum):
    """Traffic-light lanes for action risk."""

    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"
    BLOCKED = "BLOCKED"

    def __str__(self) -> str:
        """Return the value for string representation."""
        return self.value


class ManTaskStatus(str, Enum):
    """Lifecycle of a MAN task."""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    DENIED = "DENIED"
    EXPIRED = "EXPIRED"


class ActionIntent(BaseModel):
    """Action proposed by agent requiring risk evaluation.

    Attributes:
        tool_name: Identifier of the tool to execute
        params: Parameters to pass to the tool
        workflow_id: Parent workflow identifier for tracing
        step_id: Unique step identifier within workflow (optional, defaults to empty)
        irreversible: Flag indicating action cannot be undone
        context: Additional context for risk evaluation
    """

    tool_name: str = Field(..., description="Tool identifier")
    params: dict[str, Any] = Field(default_factory=dict, description="Tool execution parameters")
    workflow_id: str = Field(..., description="Parent workflow ID")
    step_id: str = Field(default="", description="Unique step identifier")
    irreversible: bool = Field(default=False, description="Action cannot be reversed")
    context: dict[str, Any] | None = Field(default=None, description="Additional context")

    model_config = {"frozen": True}


class RiskTriageResult(BaseModel):
    """
    MASTER SCHEMA: Aligns Frontend Brochure (Class A-D) with Backend Logic.
    """

    lane: ManLane = Field(..., description="Action: RED (Block), YELLOW (Review), GREEN (Pass)")
    risk_class: Literal["A", "B", "C", "D"] = Field(
        ..., description="Marketing Tier: A=Critical, D=Safe"
    )
    reasoning: str = Field(...)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    # CRITICAL: Demo flag to bypass DB in presentation mode
    is_demo: bool = Field(default=False)

    # Optional fields for backward compatibility or future use
    requires_approval: bool = Field(default=True, description="Human approval required")
    risk_factors: list[str] = Field(default_factory=list, description="Contributing risk factors")
    suggested_timeout_hours: int = Field(default=24, description="Approval timeout in hours")


class ManTaskDecision(BaseModel):
    """Human decision on approval task.

    Attributes:
        status: Approval decision (APPROVED/DENIED)
        reason: Human-provided rationale
        decided_by: Identity of decision maker
        decided_at: Timestamp of decision
        metadata: Additional decision context
    """

    status: ManTaskStatus = Field(..., description="Decision outcome")
    reason: str | None = Field(default=None, description="Decision rationale")
    decided_by: str = Field(default="unknown", description="Decision maker identity")
    decided_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), description="Decision timestamp"
    )
    metadata: dict[str, Any] | None = Field(default=None, description="Additional context")


class ManTask(BaseModel):
    """Durable approval task record.

    Represents a single action awaiting human review.
    Stored in man_tasks database table.

    Attributes:
        id: Unique task identifier
        idempotency_key: Prevents duplicate task creation
        workflow_id: Parent workflow identifier
        step_id: Step identifier within workflow
        status: Current task state (PENDING/APPROVED/DENIED)
        intent: Original action requiring approval
        triage_result: Risk triage result
        decision: Human decision (null until decided)
        created_at: Task creation timestamp
    """

    id: UUID = Field(default_factory=uuid4, description="Task ID")
    idempotency_key: str = Field(..., description="Unique key for idempotent creation")
    workflow_id: str = Field(..., description="Parent workflow ID")
    step_id: str = Field(default="", description="Step identifier")
    status: ManTaskStatus = Field(default=ManTaskStatus.PENDING, description="Task status")
    intent: ActionIntent = Field(..., description="Proposed action")
    triage_result: RiskTriageResult | None = Field(default=None, description="Risk triage result")
    decision: ManTaskDecision | None = Field(
        default=None, description="Human decision (null until decided)"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), description="Creation timestamp"
    )


def create_idempotency_key(
    workflow_id: str,
    step_id: str,
    tool_name: str | None = None,
    namespace: str | None = None,
) -> str:
    """Generate idempotency key for task creation.

    Args:
        workflow_id: Parent workflow identifier
        step_id: Step identifier within workflow
        tool_name: Optional tool name for stronger uniqueness
        namespace: Optional prefix (e.g., "man")

    Returns:
        Idempotency key in format "namespace:{workflow_id}:{step_id}:{tool}"

    Example:
        >>> create_idempotency_key("wf-123", "step-5")
        'wf-123:step-5'
    """
    parts = [workflow_id, step_id]
    if tool_name:
        parts.append(tool_name)

    key_body = ":".join(parts)
    return f"{namespace}:{key_body}" if namespace else key_body
