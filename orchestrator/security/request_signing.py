"""
HMAC Request Signing Verification for Orchestrator API.

Verifies that incoming POST /api/v1/goals requests are signed
by an authorized Edge Function using a shared secret.

Canonical string format:
    METHOD + "\\n" + PATH + "\\n" + TIMESTAMP + "\\n" + TRACE_ID + "\\n" + SHA256_HEX(BODY_RAW)

Toggle: ORCHESTRATOR_REQUIRE_SIGNATURE (default: true in production, false otherwise)
Secret: ORCHESTRATOR_SHARED_SECRET (env only, never logged)
"""

import hashlib
import hmac
import os
import re
import time

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

# Paths that require signature verification
_SIGNED_PATHS = {"/api/v1/goals"}

# Maximum allowed clock skew in seconds
_MAX_TIMESTAMP_SKEW = 300

# Base64 detection: contains only base64 chars and optionally padding
_BASE64_RE = re.compile(r"^[A-Za-z0-9+/]+=*$")


def _is_signature_required() -> bool:
    """Check if signature verification is enabled via environment."""
    env_val = os.environ.get("ORCHESTRATOR_REQUIRE_SIGNATURE", "")
    if env_val.lower() in ("true", "1", "yes"):
        return True
    if env_val.lower() in ("false", "0", "no"):
        return False
    # Default: enabled in production, disabled otherwise
    environment = os.environ.get("ENVIRONMENT", "development")
    return environment == "production"


def _get_shared_secret() -> bytes:
    """Retrieve shared secret from environment."""
    secret = os.environ.get("ORCHESTRATOR_SHARED_SECRET", "")
    if not secret:
        raise ValueError("ORCHESTRATOR_SHARED_SECRET not configured")
    return secret.encode("utf-8")


def _decode_signature(sig_str: str) -> bytes:
    """Decode signature from hex or base64 format."""
    # Try hex first (64 chars for SHA-256)
    try:
        decoded = bytes.fromhex(sig_str)
        if len(decoded) == 32:
            return decoded
    except ValueError:
        pass
    # Try base64
    if _BASE64_RE.match(sig_str):
        import base64

        try:
            decoded = base64.b64decode(sig_str)
            if len(decoded) == 32:
                return decoded
        except Exception:  # noqa: S110 - intentional: invalid base64 falls through to error
            pass
    raise ValueError("Invalid signature format")


def compute_signature(
    secret: bytes,
    method: str,
    path: str,
    timestamp: str,
    trace_id: str,
    body_raw: bytes,
) -> bytes:
    """
    Compute HMAC-SHA256 signature over canonical string.

    Returns raw bytes (caller decides hex/base64 encoding).
    """
    body_hash = hashlib.sha256(body_raw).hexdigest()
    canonical = f"{method}\n{path}\n{timestamp}\n{trace_id}\n{body_hash}"
    return hmac.new(secret, canonical.encode("utf-8"), hashlib.sha256).digest()


def verify_request(
    method: str,
    path: str,
    timestamp_str: str,
    trace_id: str,
    signature_str: str,
    body_raw: bytes,
) -> str | None:
    """
    Verify request signature. Returns None on success, error string on failure.
    """
    # Validate timestamp
    try:
        timestamp = int(timestamp_str)
    except (ValueError, TypeError):
        return "invalid_timestamp"

    now = int(time.time())
    if abs(now - timestamp) > _MAX_TIMESTAMP_SKEW:
        return "timestamp_expired"

    # Get secret
    try:
        secret = _get_shared_secret()
    except ValueError:
        return "server_config_error"

    # Compute expected signature
    expected = compute_signature(secret, method, path, timestamp_str, trace_id, body_raw)

    # Decode provided signature
    try:
        provided = _decode_signature(signature_str)
    except ValueError:
        return "invalid_signature_format"

    # Constant-time comparison
    if not hmac.compare_digest(expected, provided):
        return "signature_mismatch"

    return None


class SignatureVerificationMiddleware(BaseHTTPMiddleware):
    """FastAPI middleware for HMAC signature verification."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Only verify signed paths with POST
        if request.method != "POST" or request.url.path not in _SIGNED_PATHS:
            return await call_next(request)

        # Check if verification is enabled
        if not _is_signature_required():
            return await call_next(request)

        # Extract required headers
        timestamp = request.headers.get("X-Omni-Timestamp")
        trace_id = request.headers.get("X-Omni-Trace-Id")
        signature = request.headers.get("X-Omni-Signature")

        if not timestamp or not trace_id or not signature:
            return Response(
                content='{"error":"unauthorized"}',
                status_code=401,
                media_type="application/json",
            )

        # Read body (FastAPI caches this via request.body())
        body_raw = await request.body()

        # Verify
        error = verify_request(
            method=request.method,
            path=request.url.path,
            timestamp_str=timestamp,
            trace_id=trace_id,
            signature_str=signature,
            body_raw=body_raw,
        )

        if error is not None:
            return Response(
                content='{"error":"unauthorized"}',
                status_code=401,
                media_type="application/json",
            )

        return await call_next(request)
