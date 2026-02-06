from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from pydantic import BaseModel, Field


class AuthType(StrEnum):
    OAUTH = "oauth"
    API_KEY = "api_key"
    DEVICE_CODE = "device_code"
    BASIC = "basic"


class VerificationMethod(StrEnum):
    PROVIDER_PROFILE = "provider_profile"
    TOKEN_INTROSPECTION = "token_introspection"  # noqa: S105
    SAFE_PING = "safe_ping"


class TriforceTier(StrEnum):
    STANDARD = "standard"
    HIGH = "high"


class OmniBoardState(StrEnum):
    IDLE_LISTEN = "IDLE_LISTEN"
    APP_IDENTIFICATION = "APP_IDENTIFICATION"
    APP_DISAMBIGUATION = "APP_DISAMBIGUATION"
    AUTH_SETUP = "AUTH_SETUP"
    AUTH_COMPLETE = "AUTH_COMPLETE"
    VERIFY_CONNECTION = "VERIFY_CONNECTION"
    REGISTER_CONNECTION = "REGISTER_CONNECTION"
    COMPLETION = "COMPLETION"
    RECOVERY_RETRY = "RECOVERY_RETRY"


class ConnectionDetails(BaseModel):
    connection_id: str = Field(..., pattern=r"^conn_[0-9a-fA-F-]{36}$")
    provider_name: str
    provider_hint: str
    match_confidence: float = Field(ge=0.0, le=1.0)
    auth_type: AuthType
    token_ref: str = Field(..., pattern=r"^vault://.*")
    verified: bool
    verification_method: VerificationMethod
    connected_at: str

    @staticmethod
    def generate_id() -> str:
        return f"conn_{uuid4()}"


class SecurityContext(BaseModel):
    guardian_profile: str = "default"
    triforce_tier: TriforceTier = TriforceTier.STANDARD
    risk_flags: list[str] = Field(default_factory=list)


class AuditContext(BaseModel):
    trace_id: str
    created_at: str


class ConnectionSpec(BaseModel):
    """
    The Canonical Connection Spec.
    MUST match docs/omniboard.md exactly.
    """

    omniboard_version: str = "1.0"
    tenant_id: str
    connection: ConnectionDetails
    security: SecurityContext
    audit: AuditContext


# --- FSM Interaction Models ---


class FSMContext(BaseModel):
    """Internal state storage for the FSM session."""

    session_id: str
    tenant_id: str
    state: OmniBoardState
    trace_id: str

    # Accumulated Data
    provider_name: str | None = None
    provider_hint: str | None = None
    candidates: list[str] = Field(default_factory=list)
    auth_type: AuthType | None = None
    temp_credentials: dict | None = None  # Ephemeral, moved to Vault ASAP
    retry_count: int = 0

    # Output
    final_spec: ConnectionSpec | None = None


class FSMEvent(BaseModel):
    """Input event to trigger a transition."""

    event_type: str  # e.g., 'USER_INPUT', 'SYSTEM_ERROR', 'PROVIDER_SELECTED'
    payload: dict = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
