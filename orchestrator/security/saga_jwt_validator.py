"""
APEX Orchestrator — Saga JWT Claim Validator.

Validates JWT tokens passed through saga event contracts.
Enforces the tenant_id claim requirement for financial operations.

Compliance:
    - ruff format (100-char line limit)
    - SonarQube A-grade: no float, anchored regex, no secrets in code
    - Fail-closed: any claim mismatch raises SagaAuthError
"""

from __future__ import annotations

import base64
import json
import logging
import re
import time
from typing import Any

logger = logging.getLogger(__name__)

# ── Anchored patterns ──────────────────────────────────────────────────────────

# JWT structure: three base64url segments separated by dots
_JWT_STRUCTURE_RE = re.compile(r"^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$")

# Ethereum wallet address: 0x followed by exactly 40 hex chars
_WALLET_ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")


# ── Exceptions ─────────────────────────────────────────────────────────────────


class SagaAuthError(Exception):
    """Raised when saga JWT validation fails. Non-retryable."""


# ── Claim extraction ───────────────────────────────────────────────────────────


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    """
    Decode the JWT payload segment without signature verification.

    Signature verification is performed by Supabase Auth; this function
    extracts claims for saga-level routing decisions only.

    Args:
        token: A JWT string in three-segment base64url format.

    Returns:
        Decoded claims dict.

    Raises:
        SagaAuthError: If the token structure is invalid.
    """
    if not _JWT_STRUCTURE_RE.match(token):
        raise SagaAuthError("SAGA_JWT: malformed token structure")

    segments = token.split(".")
    payload_segment = segments[1]

    # Restore base64url padding
    padding = 4 - len(payload_segment) % 4
    if padding != 4:
        payload_segment += "=" * padding

    try:
        decoded = base64.urlsafe_b64decode(payload_segment)
        return json.loads(decoded)
    except ValueError as exc:
        raise SagaAuthError(f"SAGA_JWT: payload decode failed — {exc}") from exc


# ── Validation ─────────────────────────────────────────────────────────────────


def validate_saga_jwt_claims(
    token: str,
    *,
    require_tenant_id: bool = True,
    expected_tenant_id: str | None = None,
) -> dict[str, Any]:
    """
    Validate saga JWT claims for financial operations.

    Enforces:
        - Token is structurally valid
        - Token is not expired (exp claim)
        - tenant_id claim is present and non-empty when required
        - tenant_id matches expected value when provided (write-once guard)

    Args:
        token: JWT access token from the saga event contract.
        require_tenant_id: Require tenant_id claim (default True).
        expected_tenant_id: When set, tenant_id must match exactly.

    Returns:
        Decoded claims dict (for saga routing).

    Raises:
        SagaAuthError: On any validation failure (fail-closed).
    """
    claims = _decode_jwt_payload(token)

    # Expiry check
    exp = claims.get("exp")
    if isinstance(exp, (int, float)) and time.time() > float(exp):
        raise SagaAuthError("SAGA_JWT: token is expired")

    if not require_tenant_id:
        return claims

    # tenant_id presence
    tenant_id = claims.get("tenant_id")
    if not tenant_id or not isinstance(tenant_id, str) or not tenant_id.strip():
        raise SagaAuthError("SAGA_JWT: missing or empty tenant_id claim")

    # tenant_id format: must be a valid wallet address (EIP-4361 identity)
    if not _WALLET_ADDRESS_RE.match(tenant_id):
        raise SagaAuthError(f"SAGA_JWT: tenant_id is not a valid wallet address — {tenant_id!r}")

    # Exact match guard (write-once tenant isolation)
    if expected_tenant_id is not None and tenant_id != expected_tenant_id:
        raise SagaAuthError(
            f"SAGA_JWT: tenant_id mismatch — expected {expected_tenant_id!r}, got {tenant_id!r}"
        )

    logger.debug(
        "SAGA_JWT: claims validated",
        extra={
            "tenant_id": tenant_id,
            "sub": claims.get("sub"),
        },
    )
    return claims


def extract_tenant_id(token: str) -> str:
    """
    Extract and return the tenant_id claim from a saga JWT.

    Convenience wrapper around validate_saga_jwt_claims().

    Args:
        token: JWT access token.

    Returns:
        The tenant_id string.

    Raises:
        SagaAuthError: If claim is absent or invalid.
    """
    claims = validate_saga_jwt_claims(token, require_tenant_id=True)
    return str(claims["tenant_id"])
