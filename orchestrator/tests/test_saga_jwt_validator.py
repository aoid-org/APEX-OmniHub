import base64
import hashlib
import hmac
import json

import pytest

from security.saga_jwt_validator import SagaAuthError, validate_saga_jwt_claims


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _jwt(secret: str, claims: dict[str, object]) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(json.dumps(claims).encode())
    signature = hmac.new(secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256)
    return f"{header}.{payload}.{_b64url(signature.digest())}"


def test_validate_saga_jwt_claims_accepts_bound_user_and_tenant(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    token = _jwt(
        "secret",
        {
            "sub": "user-1",
            "exp": 2_000,
            "app_metadata": {"tenant_id": "tenant-1"},
        },
    )

    claims = validate_saga_jwt_claims(
        token,
        expected_user_id="user-1",
        expected_tenant_id="tenant-1",
        now_ts=1_000,
    )

    assert claims["sub"] == "user-1"


def test_validate_saga_jwt_claims_fails_closed_when_missing(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")

    with pytest.raises(SagaAuthError, match="Missing saga JWT token"):
        validate_saga_jwt_claims(None, expected_user_id="user-1", now_ts=1_000)


def test_validate_saga_jwt_claims_rejects_tenant_mismatch(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    token = _jwt(
        "secret",
        {"sub": "user-1", "exp": 2_000, "app_metadata": {"tenant_id": "tenant-1"}},
    )

    with pytest.raises(SagaAuthError, match="tenant"):
        validate_saga_jwt_claims(
            token,
            expected_user_id="user-1",
            expected_tenant_id="tenant-2",
            now_ts=1_000,
        )


def test_validate_saga_jwt_claims_rejects_bad_signature(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "secret")
    token = _jwt("other-secret", {"sub": "user-1", "exp": 2_000})

    with pytest.raises(SagaAuthError, match="signature"):
        validate_saga_jwt_claims(token, expected_user_id="user-1", now_ts=1_000)
