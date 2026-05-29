"""Tests for HMAC request signing verification."""

import base64
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from security.request_signing import (
    SignatureVerificationMiddleware,
    _decode_signature,
    _is_signature_required,
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

    def test_future_timestamp_within_skew(self):
        body = b'{"test":"data"}'
        future_ts = str(int(time.time()) + 120)  # 2 min in future
        _, tid, sig = _sign(body=body, timestamp=future_ts)
        result = verify_request("POST", "/api/v1/goals", future_ts, tid, sig, body)
        assert result is None

    def test_future_timestamp_outside_skew(self):
        body = b'{"test":"data"}'
        future_ts = str(int(time.time()) + 600)  # 10 min in future
        _, tid, sig = _sign(body=body, timestamp=future_ts)
        result = verify_request("POST", "/api/v1/goals", future_ts, tid, sig, body)
        assert result == "timestamp_expired"

    def test_wrong_secret(self):
        body = b'{"test":"data"}'
        ts, tid, sig = _sign(body=body, secret="wrong-secret")  # noqa: S106
        result = verify_request("POST", "/api/v1/goals", ts, tid, sig, body)
        assert result == "signature_mismatch"

    def test_mismatched_method(self):
        body = b'{"test":"data"}'
        ts, tid, sig = _sign(method="POST", body=body)
        result = verify_request("PUT", "/api/v1/goals", ts, tid, sig, body)
        assert result == "signature_mismatch"

    def test_mismatched_path(self):
        body = b'{"test":"data"}'
        ts, tid, sig = _sign(path="/api/v1/goals", body=body)
        result = verify_request("POST", "/api/v1/intents", ts, tid, sig, body)
        assert result == "signature_mismatch"

    def test_mismatched_trace_id(self):
        body = b'{"test":"data"}'
        ts, _, sig = _sign(trace_id="trace-1", body=body)
        result = verify_request("POST", "/api/v1/goals", ts, "trace-2", sig, body)
        assert result == "signature_mismatch"

    def test_mismatched_body(self):
        ts, tid, sig = _sign(body=b'{"a":1}')
        result = verify_request("POST", "/api/v1/goals", ts, tid, sig, b'{"a":2}')
        assert result == "signature_mismatch"

    def test_no_secret_configured(self, monkeypatch):
        monkeypatch.delenv("ORCHESTRATOR_SHARED_SECRET", raising=False)
        body = b'{"test":"data"}'
        ts, tid, sig = _sign(body=body)
        result = verify_request("POST", "/api/v1/goals", ts, tid, sig, body)
        assert result == "server_config_error"

    def test_invalid_signature_format_returns_error(self):
        """Signature that is neither valid hex nor base64 should fail with invalid_signature_format."""
        body = b'{"test":"data"}'
        ts, tid, _ = _sign(body=body)
        # "!!!" is neither hex nor valid base64
        result = verify_request("POST", "/api/v1/goals", ts, tid, "!!!", body)
        assert result == "invalid_signature_format"


class TestIsSignatureRequired:
    def test_returns_true_when_set_to_true(self, monkeypatch):
        monkeypatch.setenv("ORCHESTRATOR_REQUIRE_SIGNATURE", "true")
        assert _is_signature_required() is True

    def test_returns_true_when_set_to_1(self, monkeypatch):
        monkeypatch.setenv("ORCHESTRATOR_REQUIRE_SIGNATURE", "1")
        assert _is_signature_required() is True

    def test_returns_true_when_set_to_yes(self, monkeypatch):
        monkeypatch.setenv("ORCHESTRATOR_REQUIRE_SIGNATURE", "yes")
        assert _is_signature_required() is True

    def test_returns_false_when_set_to_false(self, monkeypatch):
        monkeypatch.setenv("ORCHESTRATOR_REQUIRE_SIGNATURE", "false")
        assert _is_signature_required() is False

    def test_returns_false_when_set_to_0(self, monkeypatch):
        monkeypatch.setenv("ORCHESTRATOR_REQUIRE_SIGNATURE", "0")
        assert _is_signature_required() is False

    def test_returns_false_when_set_to_no(self, monkeypatch):
        monkeypatch.setenv("ORCHESTRATOR_REQUIRE_SIGNATURE", "no")
        assert _is_signature_required() is False

    def test_returns_true_when_not_set(self, monkeypatch):
        monkeypatch.delenv("ORCHESTRATOR_REQUIRE_SIGNATURE", raising=False)
        assert _is_signature_required() is True

    def test_returns_true_when_unknown_value(self, monkeypatch):
        monkeypatch.setenv("ORCHESTRATOR_REQUIRE_SIGNATURE", "maybe")
        assert _is_signature_required() is True


class TestDecodeSignature:
    def test_decode_valid_hex(self):
        raw = b"\xab" * 32
        assert _decode_signature(raw.hex()) == raw

    def test_decode_valid_base64(self):
        raw = b"\xcd" * 32
        sig_b64 = base64.b64encode(raw).decode()
        assert _decode_signature(sig_b64) == raw

    def test_decode_invalid_raises_value_error(self):
        with pytest.raises(ValueError, match="Invalid signature format"):
            _decode_signature("not-a-valid-sig!!!")

    def test_decode_hex_wrong_length_falls_through_to_base64_attempt(self):
        """Hex with wrong length (not 32 bytes) should fail."""
        # 10 bytes hex = 20 chars, valid hex but wrong length for SHA-256
        short_hex = "ab" * 10
        with pytest.raises(ValueError, match="Invalid signature format"):
            _decode_signature(short_hex)

    def test_decode_base64_wrong_length_raises(self):
        """Base64 encoded data that decodes to wrong length should fail."""
        # Encode only 16 bytes in base64
        raw = b"\xff" * 16
        sig_b64 = base64.b64encode(raw).decode()
        with pytest.raises(ValueError, match="Invalid signature format"):
            _decode_signature(sig_b64)

    def test_decode_base64_exception_during_decode_raises(self):
        """When base64.b64decode raises, should still raise ValueError."""
        with patch("base64.b64decode", side_effect=Exception("bad decode")):
            # "AAAA" matches _BASE64_RE but decode will raise
            with pytest.raises(ValueError, match="Invalid signature format"):
                _decode_signature("AAAA")


class TestSignatureVerificationMiddleware:
    """Tests for SignatureVerificationMiddleware.dispatch."""

    def _make_request(self, method="POST", path="/api/v1/goals", headers=None, body=b""):
        request = MagicMock()
        request.method = method
        request.url.path = path
        request.headers = headers or {}
        request.body = AsyncMock(return_value=body)
        return request

    @pytest.mark.asyncio
    async def test_dispatch_skips_non_post_methods(self):
        """GET requests to signed paths should be passed through."""
        middleware = SignatureVerificationMiddleware(app=MagicMock())
        request = self._make_request(method="GET", path="/api/v1/goals")
        call_next = AsyncMock(return_value=MagicMock(status_code=200))
        response = await middleware.dispatch(request, call_next)
        call_next.assert_awaited_once_with(request)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dispatch_skips_non_signed_paths(self):
        """POST to an unsigned path should pass through."""
        middleware = SignatureVerificationMiddleware(app=MagicMock())
        request = self._make_request(method="POST", path="/api/v1/other")
        call_next = AsyncMock(return_value=MagicMock(status_code=200))
        response = await middleware.dispatch(request, call_next)
        call_next.assert_awaited_once_with(request)
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_dispatch_skips_when_signature_disabled(self, monkeypatch):
        """When ORCHESTRATOR_REQUIRE_SIGNATURE=false, bypass verification."""
        monkeypatch.setenv("ORCHESTRATOR_REQUIRE_SIGNATURE", "false")
        middleware = SignatureVerificationMiddleware(app=MagicMock())
        request = self._make_request(method="POST", path="/api/v1/goals")
        call_next = AsyncMock(return_value=MagicMock(status_code=200))
        await middleware.dispatch(request, call_next)
        call_next.assert_awaited_once_with(request)

    @pytest.mark.asyncio
    async def test_dispatch_returns_401_when_headers_missing(self):
        """Missing required headers return 401."""
        middleware = SignatureVerificationMiddleware(app=MagicMock())
        request = self._make_request(
            method="POST",
            path="/api/v1/goals",
            headers={},
        )
        call_next = AsyncMock()
        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 401
        call_next.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_dispatch_returns_401_on_expired_timestamp(self):
        """A request with an expired timestamp returns 401."""
        middleware = SignatureVerificationMiddleware(app=MagicMock())
        ts = str(int(time.time()) - 600)
        request = self._make_request(
            method="POST",
            path="/api/v1/goals",
            headers={
                "X-Omni-Timestamp": ts,
                "X-Omni-Trace-Id": "trace-123",
                "X-Omni-Signature": "00" * 32,
            },
        )
        call_next = AsyncMock()
        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 401
        call_next.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_dispatch_returns_401_on_invalid_timestamp_format(self):
        """A request with a non-numeric timestamp returns 401."""
        middleware = SignatureVerificationMiddleware(app=MagicMock())
        request = self._make_request(
            method="POST",
            path="/api/v1/goals",
            headers={
                "X-Omni-Timestamp": "not-a-number",
                "X-Omni-Trace-Id": "trace-123",
                "X-Omni-Signature": "00" * 32,
            },
        )
        call_next = AsyncMock()
        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 401
        call_next.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_dispatch_returns_401_when_only_some_headers_present(self):
        """If only timestamp is present (missing trace_id, signature), return 401."""
        middleware = SignatureVerificationMiddleware(app=MagicMock())
        request = self._make_request(
            method="POST",
            path="/api/v1/goals",
            headers={"X-Omni-Timestamp": str(int(time.time()))},
        )
        call_next = AsyncMock()
        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_dispatch_returns_401_on_invalid_signature(self):
        """A request with invalid signature returns 401."""
        middleware = SignatureVerificationMiddleware(app=MagicMock())
        ts = str(int(time.time()))
        request = self._make_request(
            method="POST",
            path="/api/v1/goals",
            headers={
                "X-Omni-Timestamp": ts,
                "X-Omni-Trace-Id": "trace-123",
                "X-Omni-Signature": "00" * 32,  # Wrong signature
            },
            body=b'{"goal":"test"}',
        )
        call_next = AsyncMock()
        response = await middleware.dispatch(request, call_next)
        assert response.status_code == 401
        call_next.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_dispatch_passes_with_valid_signature(self):
        """A request with a valid signature is passed through."""
        middleware = SignatureVerificationMiddleware(app=MagicMock())
        body = b'{"goal":"test"}'
        ts, trace_id, sig_hex = _sign(body=body)
        request = self._make_request(
            method="POST",
            path="/api/v1/goals",
            headers={
                "X-Omni-Timestamp": ts,
                "X-Omni-Trace-Id": trace_id,
                "X-Omni-Signature": sig_hex,
            },
            body=body,
        )
        call_next = AsyncMock(return_value=MagicMock(status_code=200))
        response = await middleware.dispatch(request, call_next)
        call_next.assert_awaited_once_with(request)
        assert response.status_code == 200
