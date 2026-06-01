"""Fail-closed JWT validation for Temporal saga workflow starts."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from typing import Any


class SagaAuthError(ValueError):
    """Raised when a saga workflow JWT is missing, invalid, or claim-mismatched."""


def _b64url_decode(segment: str) -> bytes:
    try:
        padding = "=" * (-len(segment) % 4)
        return base64.urlsafe_b64decode(f"{segment}{padding}".encode("ascii"))
    except Exception as exc:  # noqa: BLE001 - collapse parse errors into auth-safe failure
        raise SagaAuthError("Invalid saga JWT encoding") from exc


def _json_segment(segment: str, label: str) -> dict[str, Any]:
    try:
        decoded = json.loads(_b64url_decode(segment))
    except json.JSONDecodeError as exc:
        raise SagaAuthError(f"Invalid saga JWT {label}") from exc
    if not isinstance(decoded, dict):
        raise SagaAuthError(f"Invalid saga JWT {label}")
    return decoded


def _tenant_claim(claims: dict[str, Any]) -> str | None:
    tenant_id = claims.get("tenant_id")
    if isinstance(tenant_id, str) and tenant_id:
        return tenant_id

    for metadata_key in ("app_metadata", "user_metadata"):
        metadata = claims.get(metadata_key)
        if isinstance(metadata, dict):
            nested_tenant_id = metadata.get("tenant_id")
            if isinstance(nested_tenant_id, str) and nested_tenant_id:
                return nested_tenant_id

    return None


def validate_saga_jwt_claims(
    jwt_token: str | None,
    *,
    expected_user_id: str,
    expected_tenant_id: str | None = None,
    now_ts: float | None = None,
) -> dict[str, Any]:
    """Validate a Supabase HS256 JWT and bind it to the workflow user/tenant."""
    if not jwt_token:
        raise SagaAuthError("Missing saga JWT token")

    jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
    if not jwt_secret:
        raise SagaAuthError("SUPABASE_JWT_SECRET is not configured")

    parts = jwt_token.split(".")
    if len(parts) != 3 or not all(parts):
        raise SagaAuthError("Invalid saga JWT format")

    header = _json_segment(parts[0], "header")
    claims = _json_segment(parts[1], "claims")
    if header.get("alg") != "HS256":
        raise SagaAuthError("Unsupported saga JWT algorithm")

    signed_payload = f"{parts[0]}.{parts[1]}".encode("ascii")
    expected_signature = hmac.new(
        jwt_secret.encode("utf-8"), signed_payload, hashlib.sha256
    ).digest()
    supplied_signature = _b64url_decode(parts[2])
    if not hmac.compare_digest(expected_signature, supplied_signature):
        raise SagaAuthError("Invalid saga JWT signature")

    current_ts = int(now_ts if now_ts is not None else time.time())
    exp = claims.get("exp")
    if not isinstance(exp, int) or exp <= current_ts:
        raise SagaAuthError("Expired saga JWT")

    nbf = claims.get("nbf")
    if isinstance(nbf, int) and nbf > current_ts:
        raise SagaAuthError("Saga JWT is not yet valid")

    subject = claims.get("sub")
    if subject != expected_user_id:
        raise SagaAuthError("Saga JWT subject does not match workflow user")

    expected_tenant = expected_tenant_id or expected_user_id
    # Supabase user JWTs may omit tenant_id; for single-tenant user workflows, bind tenant to sub.
    token_tenant = _tenant_claim(claims) or subject
    if token_tenant != expected_tenant:
        raise SagaAuthError("Saga JWT tenant does not match workflow tenant")

    return claims
