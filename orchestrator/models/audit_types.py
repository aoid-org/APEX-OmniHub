"""Typed enterprise audit event contracts shared by audit persistence code."""

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AuditAction(str, Enum):  # noqa: UP042
    """Standardized audit actions for compliance tracking."""

    LOGIN = "login"
    LOGOUT = "logout"
    MFA_VERIFY = "mfa_verify"
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    DATA_ACCESS = "data_access"
    DATA_DELETE = "data_delete"
    CONFIG_CHANGE = "config_change"
    DEPLOY = "deploy"
    WORKFLOW_START = "workflow_start"
    WORKFLOW_COMPLETE = "workflow_complete"
    WORKFLOW_FAIL = "workflow_fail"
    DATA_MODIFY = "data_modify"
    POLICY_VIOLATION = "policy_violation"
    ACCESS_DENIED = "access_denied"


class AuditActor(BaseModel):
    """Identity of the actor performing the action."""

    user_id: str
    role: str
    ip_address: str | None = None
    user_agent: str | None = None


class AuditResource(BaseModel):
    """Resource being acted upon."""

    resource_id: str
    resource_type: str
    resource_name: str | None = None


class AuditResourceType(str, Enum):  # noqa: UP042
    """Resource types for audit logging."""

    USER = "user"
    WORKFLOW = "workflow"
    DOCUMENT = "document"
    SYSTEM_CONFIG = "system_config"
    API_KEY = "api_key"
    POLICY = "policy"
    DATABASE = "database"
    SECURITY_POLICY = "security_policy"


class AuditStatus(str, Enum):  # noqa: UP042
    """Audit event outcome status."""

    SUCCESS = "success"
    FAILURE = "failure"
    WARNING = "warning"
    TIMEOUT = "timeout"
    ERROR = "error"


class AuditMetadata(BaseModel):
    """Structured metadata for audit events."""

    user_agent: str | None = None
    ip_address: str | None = None
    geo_location: str | None = None
    session_id: str | None = None
    workflow_id: str | None = None
    workflow_run_id: str | None = None
    activity_id: str | None = None
    task_queue: str | None = None
    duration_ms: int | None = None
    retry_count: int | None = 0
    data_sensitivity: str | None = None
    compliance_flags: list[str] = Field(default_factory=list)
    custom_fields: dict[str, Any] = Field(default_factory=dict)


class AuditLogEntry(BaseModel):
    """Strict enterprise audit event with compliance and integrity metadata."""

    model_config = ConfigDict(use_enum_values=True)

    id: str = Field(..., description="Unique audit event identifier (UUID)")
    correlation_id: str = Field(..., description="Correlation ID for request tracing")
    timestamp: datetime = Field(..., description="Event timestamp (ISO 8601 with timezone)")
    event_sequence: int = Field(
        ..., description="Sequence number for ordering within correlation_id"
    )
    actor_id: str = Field(..., description="ID of the user/service that performed the action")
    actor_type: str = Field("user", description="Type of actor: user, service, system")
    actor_ip: str | None = Field(None, description="IP address of the actor")
    actor_user_agent: str | None = Field(None, description="User agent string")
    action: AuditAction = Field(..., description="Standardized action type")
    status: AuditStatus = Field(..., description="Outcome of the action")
    resource_type: AuditResourceType = Field(..., description="Type of resource being acted upon")
    resource_id: str = Field(..., description="Unique identifier of the resource")
    resource_owner: str | None = Field(None, description="Owner of the resource (if applicable)")
    metadata: AuditMetadata = Field(
        default_factory=AuditMetadata, description="Structured metadata"
    )
    data_classification: str = Field("internal", description="Data classification level")
    retention_period_days: int = Field(
        2555, description="How long to retain this log (7 years for financial)"
    )
    compliance_frameworks: list[str] = Field(
        default_factory=lambda: ["soc2", "gdpr"], description="Applicable compliance frameworks"
    )
    integrity_hash: str | None = Field(None, description="Cryptographic hash for tamper detection")
    previous_hash: str | None = Field(
        None, description="Hash of previous log entry for chain integrity"
    )
    processed_at: datetime | None = Field(None, description="When this log was processed")
    storage_location: str | None = Field(None, description="Where this log is stored")
    backup_location: str | None = Field(None, description="Backup location for DR")
