"""Tests for HMAC request signing verification."""

import base64
import time

import pytest

from security.request_signing import (
    compute_signature,
    verify_request,
)

# Test secret used throughout - not a real credential (S107)
_TEST_SECRET = "test-secret-key-123"  # noqa: S105


@pytest.fixture(autouse=True)
def _set_secret(monkeypatch):
    monkeypatch.setenv("ORCHESTRATOR_SHARED_SECRET", _TEST_SECRET)


def _sign(
    method: str = "POST",
    path: str = "/api/v1/goals",
    body: bytes = b'{"user_id":"u1","user_intent":"hello","trace_id":"t1"}',
    secret: str = _TEST_SECRET,
    timestamp: str | None = None,
    trace_id: str = "trace-abc",
) -> tuple[str, str, str]:
    """Helper: compute valid signature, return (timestamp, trace_id, sig_hex)."""
    ts = timestamp or str(int(time.time()))
    sig = compute_signature(
        secret=secret.encode("utf-8"),
        method=method,
        path=path,
        timestamp=ts,
        trace_id=trace_id,
        body_raw=body,
    )
    return ts, trace_id, sig.hex()


class TestComputeSignature:
    def test_deterministic(self):
        sig1 = compute_signature(b"key", "POST", "/p", "1", "t", b"body")
        sig2 = compute_signature(b"key", "POST", "/p", "1", "t", b"body")
        assert sig1 == sig2

    def test_different_body_different_sig(self):
        sig1 = compute_signature(b"key", "POST", "/p", "1", "t", b"a")
        sig2 = compute_signature(b"key", "POST", "/p", "1", "t", b"b")
        assert sig1 != sig2

    def test_different_secret_different_sig(self):
        sig1 = compute_signature(b"key1", "POST", "/p", "1", "t", b"body")
        sig2 = compute_signature(b"key2", "POST", "/p", "1", "t", b"body")
        assert sig1 != sig2


class TestVerifyRequest:
    def test_valid_signature_hex(self):
        body = b'{"test":"data"}'
        ts, tid, sig = _sign(body=body)
        result = verify_request("POST", "/api/v1/goals", ts, tid, sig, body)
        assert result is None  # None = success

    def test_valid_signature_base64(self):
        body = b'{"test":"data"}'
        ts = str(int(time.time()))
        trace_id = "trace-abc"
        raw_sig = compute_signature(
            _TEST_SECRET.encode(), "POST", "/api/v1/goals", ts, trace_id, body
        )
        sig_b64 = base64.b64encode(raw_sig).decode()
        result = verify_request("POST", "/api/v1/goals", ts, trace_id, sig_b64, body)
        assert result is None

    def test_wrong_signature(self):
        body = b'{"test":"data"}'
        ts, tid, _ = _sign(body=body)
        result = verify_request("POST", "/api/v1/goals", ts, tid, "00" * 32, body)
        assert result == "signature_mismatch"

    def test_missing_timestamp(self):
        result = verify_request("POST", "/api/v1/goals", "", "t", "aa" * 32, b"")
        assert result == "invalid_timestamp"

    def test_expired_timestamp(self):
        body = b'{"test":"data"}'
        old_ts = str(int(time.time()) - 600)  # 10 min ago
        _, tid, sig = _sign(body=body, timestamp=old_ts)
        result = verify_request("POST", "/api/v1/goals", old_ts, tid, sig, body)
        assert result == "timestamp_expired"

    def test_wrong_secret(self):
        body = b'{"test":"data"}'
        ts, tid, sig = _sign(body=body, secret="wrong-secret")  # noqa: S106
        result = verify_request("POST", "/api/v1/goals", ts, tid, sig, body)
        assert result == "signature_mismatch"

    def test_no_secret_configured(self, monkeypatch):
        monkeypatch.delenv("ORCHESTRATOR_SHARED_SECRET", raising=False)
        body = b'{"test":"data"}'
        ts, tid, sig = _sign(body=body)
        result = verify_request("POST", "/api/v1/goals", ts, tid, sig, body)
        assert result == "server_config_error"
