"""
Tests for omega.dashboard — Verification Dashboard HTTP Handler

Covers: escape_html, sanitize_data_recursive, VerificationDashboardHandler
request handling (GET/POST), input validation, error paths, XSS defense,
start_dashboard lifecycle, _main entry, and ThreadingHTTPServer fallback.

Quality: OMNI-TEST UNIVERSAL v3.0 compliant (AAA pattern, one behavior per test,
Given/When/Then naming, 100% coverage target).
"""

import json
from io import BytesIO
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from omega.dashboard import (
    VerificationDashboardHandler,
    _main,
    escape_html,
    sanitize_data_recursive,
    start_dashboard,
)


# ──────────────────────────────────────────────
# Test helpers
# ──────────────────────────────────────────────
def _make_handler(
    method: str, path: str, body: bytes = b""
) -> VerificationDashboardHandler:
    """Build a handler without a real socket for isolated unit testing."""
    handler = VerificationDashboardHandler.__new__(VerificationDashboardHandler)
    handler.rfile = BytesIO(body)
    handler.wfile = BytesIO()
    handler.headers = {"Content-Length": str(len(body))}
    handler.path = path
    handler.requestline = f"{method} {path} HTTP/1.1"
    handler.request_version = "HTTP/1.1"
    handler.command = method
    handler.client_address = ("127.0.0.1", 0)
    handler.server = MagicMock()
    handler.engine = MagicMock()
    handler.send_response = MagicMock()
    handler.send_header = MagicMock()
    handler.end_headers = MagicMock()
    handler.log_request = MagicMock()
    return handler


def _make_post_handler(
    path: str, payload: dict[str, str]
) -> VerificationDashboardHandler:
    """Build a POST handler with JSON body and proper Content-Length mock."""
    body = json.dumps(payload).encode()
    h = _make_handler("POST", path, body)
    h.rfile = BytesIO(body)
    h.headers = MagicMock()
    h.headers.get = MagicMock(return_value=str(len(body)))
    return h


# ──────────────────────────────────────────────
# Unit: escape_html
# ──────────────────────────────────────────────
class TestEscapeHtml:
    """escape_html must neutralize XSS payloads via markupsafe."""

    def test_escapes_angle_brackets(self) -> None:
        assert escape_html("<script>alert(1)</script>") == (
            "&lt;script&gt;alert(1)&lt;/script&gt;"
        )

    def test_escapes_ampersand(self) -> None:
        assert escape_html("a&b") == "a&amp;b"

    def test_escapes_quotes(self) -> None:
        result = escape_html('"hello"')
        assert "&" in result or "&#" in result

    def test_passthrough_safe_string(self) -> None:
        assert escape_html("hello world") == "hello world"

    def test_empty_string(self) -> None:
        assert escape_html("") == ""


# ──────────────────────────────────────────────
# Unit: sanitize_data_recursive
# ──────────────────────────────────────────────
class TestSanitizeDataRecursive:
    """Recursive sanitizer must escape strings at every nesting depth."""

    def test_sanitizes_string(self) -> None:
        assert sanitize_data_recursive("<b>bold</b>") == "&lt;b&gt;bold&lt;/b&gt;"

    def test_sanitizes_dict_values(self) -> None:
        result = sanitize_data_recursive({"key": "<img onerror=alert(1)>"})
        assert "<" not in result["key"]

    def test_sanitizes_list_items(self) -> None:
        result = sanitize_data_recursive(["<script>", "safe"])
        assert result[0] == "&lt;script&gt;"
        assert result[1] == "safe"

    def test_preserves_non_strings(self) -> None:
        result = sanitize_data_recursive({"num": 42, "flag": True, "nil": None})
        assert result == {"num": 42, "flag": True, "nil": None}

    def test_nested_structures(self) -> None:
        data: dict[str, Any] = {"a": [{"b": "<x>"}]}
        result = sanitize_data_recursive(data)
        assert result["a"][0]["b"] == "&lt;x&gt;"


# ──────────────────────────────────────────────
# Unit: _sanitize_request_id
# ──────────────────────────────────────────────
class TestSanitizeRequestId:
    """Request ID validation rejects XSS payloads and over-length values."""

    def test_accepts_valid_alphanumeric_hyphen_id(self) -> None:
        h = _make_handler("GET", "/")
        assert h._sanitize_request_id("task-demo-001") == "task-demo-001"

    def test_rejects_empty_string(self) -> None:
        h = _make_handler("GET", "/")
        with pytest.raises(ValueError, match="Invalid request ID"):
            h._sanitize_request_id("")

    def test_rejects_html_special_chars(self) -> None:
        h = _make_handler("GET", "/")
        with pytest.raises(ValueError, match="Invalid request ID"):
            h._sanitize_request_id("<script>alert(1)</script>")

    def test_rejects_exceeding_64_chars(self) -> None:
        h = _make_handler("GET", "/")
        with pytest.raises(ValueError, match="too long"):
            h._sanitize_request_id("a" * 65)


# ──────────────────────────────────────────────
# Unit: _sanitize_username
# ──────────────────────────────────────────────
class TestSanitizeUsername:
    """Username validation rejects XSS payloads and over-length values."""

    def test_accepts_valid_email_format(self) -> None:
        h = _make_handler("GET", "/")
        assert h._sanitize_username("admin@apex.local") == "admin@apex.local"

    def test_rejects_empty_string(self) -> None:
        h = _make_handler("GET", "/")
        with pytest.raises(ValueError, match="Invalid username"):
            h._sanitize_username("")

    def test_rejects_html_injection(self) -> None:
        h = _make_handler("GET", "/")
        with pytest.raises(ValueError, match="Invalid username"):
            h._sanitize_username("<script>")

    def test_rejects_exceeding_100_chars(self) -> None:
        h = _make_handler("GET", "/")
        with pytest.raises(ValueError, match="too long"):
            h._sanitize_username("a" * 101)


# ──────────────────────────────────────────────
# Unit: GET direct method calls
# ──────────────────────────────────────────────
class TestGetDirectMethods:
    """Direct handler method tests for GET endpoints."""

    def test_serve_dashboard_returns_html(self) -> None:
        h = _make_handler("GET", "/")
        h._serve_dashboard()
        h.send_response.assert_called_with(200)
        assert "APEX Verification Dashboard" in h.wfile.getvalue().decode()

    def test_handle_get_pending_returns_json(self) -> None:
        h = _make_handler("GET", "/api/pending")
        h.engine.get_pending_requests.return_value = {}
        h._handle_get_pending()
        h.send_response.assert_called_with(200)


# ──────────────────────────────────────────────
# Unit: POST direct method calls
# ──────────────────────────────────────────────
class TestPostDirectMethods:
    """Direct handler method tests for POST endpoints."""

    def test_handle_approve_calls_engine(self) -> None:
        h = _make_handler("POST", "/api/approve")
        h.engine.approve_request.return_value = {"status": "approved"}
        h._handle_approve({"request_id": "task-001", "approved_by": "admin"})
        h.engine.approve_request.assert_called_once()

    def test_handle_reject_calls_engine(self) -> None:
        h = _make_handler("POST", "/api/reject")
        h.engine.reject_request.return_value = {"status": "rejected"}
        h._handle_reject(
            {
                "request_id": "task-002",
                "rejected_by": "admin",
                "reason": "Not ready",
            }
        )
        h.engine.reject_request.assert_called_once()


# ──────────────────────────────────────────────
# Integration: do_GET dispatch
# ──────────────────────────────────────────────
class TestDoGetDispatch:
    """do_GET routes to correct handler based on path."""

    def test_routes_root_to_dashboard(self) -> None:
        h = _make_handler("GET", "/")
        h.do_GET()
        h.send_response.assert_called_with(200)
        assert "APEX" in h.wfile.getvalue().decode()

    def test_routes_api_pending_to_handler(self) -> None:
        h = _make_handler("GET", "/api/pending")
        h.engine.get_pending_requests.return_value = {"r1": {}}
        h.do_GET()
        h.engine.get_pending_requests.assert_called_once()
        h.send_response.assert_called_with(200)

    def test_unknown_path_returns_404(self) -> None:
        h = _make_handler("GET", "/nonexistent")
        h.do_GET()
        h.send_response.assert_called_with(404)


# ──────────────────────────────────────────────
# Integration: do_POST dispatch
# ──────────────────────────────────────────────
class TestDoPostDispatch:
    """do_POST routes, parses JSON, and handles error paths."""

    def test_routes_approve_and_calls_engine(self) -> None:
        h = _make_post_handler(
            "/api/approve", {"request_id": "abc-123", "approved_by": "admin"}
        )
        h.engine.approve_request.return_value = {"status": "approved"}
        h.do_POST()
        h.engine.approve_request.assert_called_once()
        h.send_response.assert_called_with(200)

    def test_routes_reject_and_calls_engine(self) -> None:
        h = _make_post_handler(
            "/api/reject",
            {
                "request_id": "abc-123",
                "rejected_by": "admin",
                "reason": "nope",
            },
        )
        h.engine.reject_request.return_value = {"status": "rejected"}
        h.do_POST()
        h.engine.reject_request.assert_called_once()
        h.send_response.assert_called_with(200)

    def test_invalid_json_body_returns_400(self) -> None:
        h = _make_handler("POST", "/api/approve", b"not-json")
        h.rfile = BytesIO(b"not-json")
        h.headers = {"Content-Length": "8"}
        h.do_POST()
        h.send_response.assert_called_with(400)

    def test_unknown_post_path_returns_404(self) -> None:
        body = json.dumps({"data": "test"}).encode()
        h = _make_handler("POST", "/nonexistent", body)
        h.rfile = BytesIO(body)
        h.headers = {"Content-Length": str(len(body))}
        h.do_POST()
        h.send_response.assert_called_with(404)

    def test_value_error_from_validation_returns_400(self) -> None:
        """Trigger ValueError from _sanitize_request_id via invalid chars."""
        h = _make_post_handler(
            "/api/approve", {"request_id": "!!!bad!!!", "approved_by": "admin"}
        )
        h.do_POST()
        h.send_response.assert_called_with(400)


# ──────────────────────────────────────────────
# Unit: _send_json and _send_error
# ──────────────────────────────────────────────
class TestResponseHelpers:
    """Response helpers sanitize output and set security headers."""

    def test_send_json_escapes_html_in_values(self) -> None:
        h = _make_handler("GET", "/")
        h._send_json({"msg": "<script>xss</script>"})
        output = h.wfile.getvalue().decode()
        assert "<script>" not in output
        assert "&lt;script&gt;" in output

    def test_send_error_escapes_message(self) -> None:
        h = _make_handler("GET", "/")
        h._send_error(500, "<b>error</b>")
        assert "<b>" not in h.wfile.getvalue().decode()

    def test_send_json_sets_security_headers(self) -> None:
        h = _make_handler("GET", "/")
        h._send_json({"ok": True})
        header_names = [c[0][0] for c in h.send_header.call_args_list]
        assert "X-Content-Type-Options" in header_names
        assert "Content-Type" in header_names


# ──────────────────────────────────────────────
# Integration: start_dashboard lifecycle
# ──────────────────────────────────────────────
class TestStartDashboard:
    """start_dashboard server creation and KeyboardInterrupt handling."""

    @patch("omega.dashboard.ThreadingHTTPServer")
    def test_keyboard_interrupt_shuts_down_gracefully(
        self, mock_cls: MagicMock
    ) -> None:
        mock_server = MagicMock()
        mock_server.serve_forever.side_effect = KeyboardInterrupt
        mock_cls.return_value = mock_server
        start_dashboard(port=9999)
        mock_cls.assert_called_once_with(
            ("localhost", 9999), VerificationDashboardHandler
        )
        mock_server.serve_forever.assert_called_once()
        mock_server.shutdown.assert_called_once()

    @patch("omega.dashboard.ThreadingHTTPServer")
    def test_normal_startup_prints_url(
        self, mock_cls: MagicMock, capsys: pytest.CaptureFixture[str]
    ) -> None:
        mock_cls.return_value = MagicMock()
        start_dashboard(port=8888)
        captured = capsys.readouterr()
        assert "8888" in captured.out
        assert "SECURITY" in captured.out


# ──────────────────────────────────────────────
# Unit: _main entry point (covers L258-261)
# ──────────────────────────────────────────────
class TestMainEntryPoint:
    """_main() delegates to start_dashboard — covers __main__ guard."""

    @patch("omega.dashboard.start_dashboard")
    def test_main_calls_start_dashboard(self, mock_start: MagicMock) -> None:
        _main()
        mock_start.assert_called_once()


# ──────────────────────────────────────────────
# Unit: __init__ (covers L73-76)
# ──────────────────────────────────────────────
class TestHandlerInit:
    """VerificationDashboardHandler.__init__ sets engine before super()."""

    def test_init_creates_engine_instance(self) -> None:
        from http.server import BaseHTTPRequestHandler

        with patch.object(BaseHTTPRequestHandler, "__init__", return_value=None):
            h = VerificationDashboardHandler()
            assert hasattr(h, "engine")


# ──────────────────────────────────────────────
# Unit: ThreadingHTTPServer fallback (covers L14-20)
# ──────────────────────────────────────────────
class TestThreadingHTTPServerFallback:
    """ImportError fallback creates a ThreadingMixIn-based server class."""

    def test_threading_server_class_is_importable(self) -> None:
        from omega.dashboard import ThreadingHTTPServer as THS

        assert THS is not None

    def test_fallback_class_created_when_import_fails(self) -> None:
        """Remove ThreadingHTTPServer from http.server, reimport dashboard."""
        import http.server as hs
        import importlib
        import sys

        original_ths = getattr(hs, "ThreadingHTTPServer", None)
        if original_ths is not None:
            delattr(hs, "ThreadingHTTPServer")

        saved_dashboard = sys.modules.pop("omega.dashboard", None)

        try:
            reloaded = importlib.import_module("omega.dashboard")
            assert hasattr(reloaded, "ThreadingHTTPServer")
            assert reloaded.ThreadingHTTPServer.daemon_threads is True
        finally:
            if original_ths is not None:
                hs.ThreadingHTTPServer = original_ths  # type: ignore[attr-defined]
            if saved_dashboard is not None:
                sys.modules["omega.dashboard"] = saved_dashboard
            elif "omega.dashboard" in sys.modules:
                del sys.modules["omega.dashboard"]
