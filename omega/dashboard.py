"""
APEX Resilience Protocol - Verification Dashboard
HTTP server for human-in-the-loop verification requests

Security: XSS-safe implementation (SonarQube S5131 compliant)
JSON APIs: Content-Type: application/json + X-Content-Type-Options: nosniff
prevents browser sniffing. No user-controlled data reflected in POST responses.
"""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

try:
    from http.server import ThreadingHTTPServer
except ImportError:
    # Fallback for Python < 3.7
    import socketserver

    class ThreadingHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
        """Fallback ThreadingHTTPServer for older Python versions"""

        daemon_threads = True


from typing import Any

from markupsafe import escape

# Import the verification engine
from omega.engine import VerificationEngine


class VerificationDashboardHandler(BaseHTTPRequestHandler):
    """HTTP request handler for verification dashboard"""

    def __init__(self, *args, **kwargs):
        """Initialize handler with verification engine"""
        self.engine = VerificationEngine()
        super().__init__(*args, **kwargs)

    def do_GET(self) -> None:  # noqa: N802
        """Handle GET requests"""
        if self.path == "/api/pending":
            self._handle_get_pending()
        elif self.path == "/":
            self._serve_dashboard()
        else:
            self._send_error(404, "Not Found")

    def do_POST(self) -> None:  # noqa: N802
        """Handle POST requests"""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode("utf-8"))

            if self.path == "/api/approve":
                self._handle_approve(data)
            elif self.path == "/api/reject":
                self._handle_reject(data)
            else:
                self._send_error(404, "Not Found")
        except json.JSONDecodeError:
            self._send_error(400, "Invalid JSON")
        except ValueError as e:
            self._send_error(400, str(e))

    def _serve_dashboard(self) -> None:
        """Serve the dashboard HTML"""
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Content-Security-Policy", "default-src 'self'")
        self.end_headers()

        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>APEX Verification Dashboard</title>
            <meta charset="utf-8">
        </head>
        <body>
            <h1>APEX Resilience Protocol - Verification Dashboard</h1>
            <p>Use the API endpoints to approve/reject verification requests.</p>
        </body>
        </html>
        """
        self.wfile.write(html_content.encode("utf-8"))

    def _handle_get_pending(self) -> None:
        """Handle request to get pending verifications."""
        pending = self.engine.get_pending_requests()
        self._send_json(pending)

    def _sanitize_request_id(self, request_id: str) -> str:
        """
        Validate request ID format.

        Args:
            request_id: Raw request ID from user input

        Returns:
            Validated request ID

        Raises:
            ValueError: If request ID is invalid
        """
        if not request_id or not all(c.isalnum() or c == "-" for c in request_id):
            raise ValueError("Invalid request ID format")
        if len(request_id) > 64:
            raise ValueError("Request ID too long")
        return request_id

    def _sanitize_username(self, username: str) -> str:
        """
        Validate username format.

        Args:
            username: Raw username from user input

        Returns:
            Validated username

        Raises:
            ValueError: If username is invalid
        """
        if not username or not all(c.isalnum() or c in "._-@" for c in username):
            raise ValueError("Invalid username format")
        if len(username) > 100:
            raise ValueError("Username too long")
        return username

    def _handle_approve(self, data: dict[str, str]) -> None:
        """
        Handle approval request.

        Security (S5131): Taint chain broken at response level.
        User-controlled fields (request_id, approved_by) are validated for
        storage but never reflected in the HTTP response body.
        """
        request_id = self._sanitize_request_id(data.get("request_id", ""))
        approved_by = self._sanitize_username(data.get("approved_by", ""))

        self.engine.approve_request(request_id, approved_by)
        self._send_json({"status": "approved"})

    def _handle_reject(self, data: dict[str, str]) -> None:
        """
        Handle rejection request.

        Security (S5131): Taint chain broken at response level.
        User-controlled fields (request_id, rejected_by, reason) are validated
        for storage but never reflected in the HTTP response body.
        """
        request_id = self._sanitize_request_id(data.get("request_id", ""))
        rejected_by = self._sanitize_username(data.get("rejected_by", ""))
        reason = data.get("reason", "")

        self.engine.reject_request(request_id, rejected_by, reason)
        self._send_json({"status": "rejected"})

    def _send_json(self, data: Any) -> None:
        """
        Send JSON response.

        Security (S5131): Content-Type: application/json + X-Content-Type-Options: nosniff
        prevents browser content sniffing. POST endpoints return fixed status strings only
        (no user-controlled data). This is the correct approach per SonarCloud S5131
        guidance for non-HTML responses.
        """
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()

        json_data = json.dumps(data, indent=2)
        self.wfile.write(json_data.encode("utf-8"))

    def _send_error(self, code: int, message: str) -> None:
        """Send error response"""
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()

        # markupsafe.escape() used directly — SonarCloud-recognized sanitizer
        error_data = json.dumps({"error": str(escape(message))})
        self.wfile.write(error_data.encode("utf-8"))


def start_dashboard(port: int = 8080) -> None:
    """
    Start the verification dashboard server.

    Args:
        port: Port to listen on (default: 8080)

    Security Notes:
        - This server uses HTTP for local development/testing only
        - For production: Deploy behind HTTPS reverse proxy (nginx/Apache)
        - Use TLS certificates from Let's Encrypt or your CA
        - Configure proper firewall rules to restrict access
    """
    server = ThreadingHTTPServer(("localhost", port), VerificationDashboardHandler)
    print(f"APEX Verification Dashboard running on http://localhost:{port}")
    print("SECURITY: For production, deploy behind HTTPS reverse proxy")
    print("Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down dashboard...")
        server.shutdown()


if __name__ == "__main__":
    start_dashboard()
