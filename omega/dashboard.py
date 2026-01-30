"""
Protocol Omega - Web Dashboard for Approval Workflow

A zero-dependency web interface for reviewing and approving verification requests.
Built with Python's http.server for minimal dependencies.

SonarQube Compliance:
- All user input is properly sanitized before reflection
- Specific exception classes used (no bare except)
- No unnecessary f-strings
- Secure HTML escaping for XSS prevention
"""

import json
import html
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Dict, Any
import sys

# Import the engine
sys.path.insert(0, str(Path(__file__).parent))
from engine import ProtocolOmegaEngine


def escape_html(text: str) -> str:
    """
    Escape HTML to prevent XSS attacks.

    Args:
        text: Raw text that may contain HTML

    Returns:
        Safely escaped HTML string
    """
    return html.escape(text, quote=True)


def sanitize_json_output(data: Any) -> str:
    """
    Sanitize JSON output to prevent injection attacks.

    Args:
        data: Data to convert to JSON

    Returns:
        Safe JSON string with escaped HTML
    """
    # Convert to JSON first
    json_str = json.dumps(data, indent=2)
    # Escape HTML entities in the JSON output
    return escape_html(json_str)


class OmegaDashboardHandler(BaseHTTPRequestHandler):
    """HTTP request handler for Protocol Omega dashboard"""

    engine = ProtocolOmegaEngine()

    def log_message(self, format_str: str, *args: Any) -> None:
        """Custom log message format"""
        # Use regular string formatting, not f-string (SonarQube compliance)
        message = format_str % args
        sys.stderr.write("[Dashboard] " + message + "\n")

    def do_GET(self) -> None:  # noqa: N802
        """Handle GET requests"""
        try:
            if self.path == '/' or self.path == '/dashboard':
                self._serve_dashboard()
            elif self.path == '/api/pending':
                self._serve_pending_requests()
            elif self.path.startswith('/api/status/'):
                request_id = self.path.split('/')[-1]
                # Sanitize request_id to prevent path traversal
                safe_request_id = self._sanitize_request_id(request_id)
                self._serve_request_status(safe_request_id)
            else:
                self._send_error(404, "Not Found")
        except ValueError as e:
            # Specific exception handling (SonarQube compliance)
            self._send_error(400, str(e))
        except FileNotFoundError as e:
            self._send_error(404, str(e))
        except PermissionError as e:
            self._send_error(403, str(e))
        except Exception as e:
            # Last resort error handler
            self._send_error(500, "Internal Server Error")
            sys.stderr.write(f"Error: {str(e)}\n")

    def do_POST(self) -> None:  # noqa: N802
        """Handle POST requests"""
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            if self.path == '/api/approve':
                self._handle_approve(data)
            elif self.path == '/api/reject':
                self._handle_reject(data)
            else:
                self._send_error(404, "Not Found")
        except json.JSONDecodeError as e:
            self._send_error(400, "Invalid JSON")
        except ValueError as e:
            self._send_error(400, str(e))
        except Exception as e:
            self._send_error(500, "Internal Server Error")
            sys.stderr.write(f"Error: {str(e)}\n")

    def _sanitize_request_id(self, request_id: str) -> str:
        """
        Sanitize request ID to prevent injection attacks.

        Args:
            request_id: Raw request ID from user input

        Returns:
            Sanitized request ID

        Raises:
            ValueError: If request ID contains invalid characters
        """
        # Only allow alphanumeric characters (hexadecimal for SHA-256 hash)
        if not request_id.isalnum():
            raise ValueError("Invalid request ID format")

        # Limit length to reasonable size (SHA-256 truncated to 16 chars)
        if len(request_id) > 64:
            raise ValueError("Request ID too long")

        return request_id

    def _sanitize_username(self, username: str) -> str:
        """
        Sanitize username to prevent injection attacks.

        Args:
            username: Raw username from user input

        Returns:
            Sanitized username

        Raises:
            ValueError: If username contains invalid characters
        """
        # Only allow alphanumeric, underscore, dash, and dot
        allowed_chars = set('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-.')
        if not all(c in allowed_chars for c in username):
            raise ValueError("Invalid username format")

        # Limit length
        if len(username) > 64:
            raise ValueError("Username too long")

        return username

    def _serve_dashboard(self) -> None:
        """Serve the main dashboard HTML"""
        html_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Protocol Omega Dashboard</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #0a0a0a;
            color: #e0e0e0;
        }
        h1 { color: #ff6b35; }
        .request-card {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .risk-critical { border-left: 4px solid #ff0000; }
        .risk-high { border-left: 4px solid #ff6b35; }
        .risk-medium { border-left: 4px solid #ffa500; }
        .risk-low { border-left: 4px solid #00ff00; }
        button {
            padding: 10px 20px;
            margin: 5px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .approve-btn {
            background: #00ff00;
            color: #000;
        }
        .reject-btn {
            background: #ff0000;
            color: #fff;
        }
        pre {
            background: #0d0d0d;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <h1>🛡️ Protocol Omega Dashboard</h1>
    <p>Pending verification requests requiring human approval</p>
    <div id="requests-container"></div>

    <script>
        async function loadRequests() {
            const response = await fetch('/api/pending');
            const requests = await response.json();

            const container = document.getElementById('requests-container');
            container.innerHTML = '';

            if (Object.keys(requests).length === 0) {
                container.innerHTML = '<p>No pending requests</p>';
                return;
            }

            for (const [requestId, request] of Object.entries(requests)) {
                const card = document.createElement('div');
                card.className = `request-card risk-${request.risk_level}`;
                card.innerHTML = `
                    <h3>Request ID: ${requestId}</h3>
                    <p><strong>Command:</strong> <code>${request.command}</code></p>
                    <p><strong>Description:</strong> ${request.description}</p>
                    <p><strong>Risk Level:</strong> <span style="color: ${getRiskColor(request.risk_level)}">${request.risk_level.toUpperCase()}</span></p>
                    <p><strong>Requested by:</strong> ${request.requested_by}</p>
                    <p><strong>Timestamp:</strong> ${request.timestamp}</p>
                    <div>
                        <button class="approve-btn" onclick="approveRequest('${requestId}')">✓ Approve</button>
                        <button class="reject-btn" onclick="rejectRequest('${requestId}')">✗ Reject</button>
                    </div>
                `;
                container.appendChild(card);
            }
        }

        function getRiskColor(risk) {
            const colors = {
                'critical': '#ff0000',
                'high': '#ff6b35',
                'medium': '#ffa500',
                'low': '#00ff00'
            };
            return colors[risk] || '#ffffff';
        }

        async function approveRequest(requestId) {
            const approver = prompt('Enter your username:');
            if (!approver) return;

            const response = await fetch('/api/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: requestId, approved_by: approver })
            });

            if (response.ok) {
                alert('Request approved!');
                loadRequests();
            } else {
                alert('Failed to approve request');
            }
        }

        async function rejectRequest(requestId) {
            const rejector = prompt('Enter your username:');
            if (!rejector) return;
            const reason = prompt('Enter rejection reason:');
            if (!reason) return;

            const response = await fetch('/api/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: requestId, rejected_by: rejector, reason: reason })
            });

            if (response.ok) {
                alert('Request rejected!');
                loadRequests();
            } else {
                alert('Failed to reject request');
            }
        }

        // Load requests on page load
        loadRequests();

        // Refresh every 5 seconds
        setInterval(loadRequests, 5000);
    </script>
</body>
</html>
"""
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html_content.encode('utf-8'))

    def _serve_pending_requests(self) -> None:
        """Serve pending requests as JSON"""
        pending = self.engine.get_pending_requests()

        # Sanitize all data before sending (SonarQube S5131 compliance)
        safe_pending = {
            self._sanitize_request_id(req_id): {
                'command': escape_html(str(req_data.get('command', ''))),
                'description': escape_html(str(req_data.get('description', ''))),
                'risk_level': escape_html(str(req_data.get('risk_level', ''))),
                'requested_by': escape_html(str(req_data.get('requested_by', ''))),
                'timestamp': escape_html(str(req_data.get('timestamp', '')))
            }
            for req_id, req_data in pending.items()
        }

        self._send_json(safe_pending)

    def _serve_request_status(self, request_id: str) -> None:
        """Serve request status as JSON"""
        try:
            status = self.engine.get_request_status(request_id)
            # Sanitize output (SonarQube compliance)
            self._send_json({'status': escape_html(str(status))})
        except ValueError as e:
            self._send_error(404, str(e))

    def _handle_approve(self, data: Dict[str, str]) -> None:
        """Handle approval request"""
        request_id = self._sanitize_request_id(data.get('request_id', ''))
        approved_by = self._sanitize_username(data.get('approved_by', ''))

        result = self.engine.approve_request(request_id, approved_by)
        self._send_json(result)

    def _handle_reject(self, data: Dict[str, str]) -> None:
        """Handle rejection request"""
        request_id = self._sanitize_request_id(data.get('request_id', ''))
        rejected_by = self._sanitize_username(data.get('rejected_by', ''))
        reason = escape_html(data.get('reason', ''))

        result = self.engine.reject_request(request_id, rejected_by, reason)
        self._send_json(result)

    def _send_json(self, data: Any) -> None:
        """Send JSON response"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        # Use safe JSON serialization
        json_data = json.dumps(data, indent=2)
        self.wfile.write(json_data.encode('utf-8'))

    def _send_error(self, code: int, message: str) -> None:
        """Send error response"""
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        # Escape error message to prevent XSS
        error_data = json.dumps({'error': escape_html(message)})
        self.wfile.write(error_data.encode('utf-8'))


def main():
    """Start the dashboard server"""
    port = 8080
    server_address = ('127.0.0.1', port)

    print("Starting Protocol Omega Dashboard...")
    print("Server running at: http://127.0.0.1:" + str(port))
    print("Press Ctrl+C to stop")

    httpd = HTTPServer(server_address, OmegaDashboardHandler)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down dashboard...")
        httpd.shutdown()


if __name__ == '__main__':
    main()
