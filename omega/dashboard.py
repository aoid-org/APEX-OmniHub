#!/usr/bin/env python3
"""
APEX-OmniHub Protocol Omega - Zero-Dependency Approval Dashboard
Uses ONLY Python standard library (http.server, urllib, json)
"""

import http.server
import socketserver
import json
import urllib.parse
from pathlib import Path
import sys

# Import engine
from engine import OmegaEngine

PORT = 8042  # APEX port
engine = OmegaEngine()


class OmegaDashboardHandler(http.server.BaseHTTPRequestHandler):
    """HTTP handler for approval dashboard"""

    def log_message(self, format, *args):
        """Custom logging"""
        sys.stderr.write(f"[Omega] {format % args}\n")

    def do_GET(self):
        """Handle GET requests"""
        if self.path == "/" or self.path == "/dashboard":
            self.serve_dashboard()
        elif self.path == "/api/pending":
            self.api_list_pending()
        elif self.path == "/api/stats":
            self.api_stats()
        elif self.path.startswith("/api/details/"):
            task_hash = self.path.split("/")[-1]
            self.api_task_details(task_hash)
        else:
            self.send_error(404, "Not Found")

    def do_POST(self):
        """Handle POST requests"""
        if self.path.startswith("/api/approve/"):
            task_hash = self.path.split("/")[-1]
            self.api_approve(task_hash)
        elif self.path.startswith("/api/reject/"):
            task_hash = self.path.split("/")[-1]
            self.api_reject(task_hash)
        else:
            self.send_error(404, "Not Found")

    def serve_dashboard(self):
        """Serve the main dashboard HTML"""
        html = self.generate_dashboard_html()
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))

    def api_list_pending(self):
        """API: List pending approvals"""
        pending = engine.list_pending()
        self.send_json(pending)

    def api_stats(self):
        """API: Get statistics"""
        stats = engine.get_stats()
        self.send_json(stats)

    def api_task_details(self, task_hash):
        """API: Get task details"""
        # This would need additional DB query - simplified for now
        self.send_json({"task_hash": task_hash})

    def api_approve(self, task_hash):
        """API: Approve a task"""
        result = engine.approve(task_hash, approved_by="dashboard")
        self.send_json(result)

    def api_reject(self, task_hash):
        """API: Reject a task"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')

        try:
            data = json.loads(body) if body else {}
            reason = data.get('reason', 'Rejected via dashboard')
        except:
            reason = "Rejected via dashboard"

        result = engine.reject(task_hash, reason)
        self.send_json(result)

    def send_json(self, data):
        """Send JSON response"""
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def generate_dashboard_html(self):
        """Generate interactive dashboard HTML (no external deps)"""
        stats = engine.get_stats()
        pending = engine.list_pending()

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Protocol Omega - Verification Dashboard</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: 'Courier New', monospace;
            background: #09090b;
            color: #e4e4e7;
            padding: 20px;
            line-height: 1.6;
        }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        header {{
            background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
            border: 2px solid #3f3f46;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            position: relative;
            overflow: hidden;
        }}
        header::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
        }}
        h1 {{
            font-size: 28px;
            margin-bottom: 10px;
            color: #22c55e;
        }}
        .subtitle {{
            color: #a1a1aa;
            font-size: 14px;
        }}
        .stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .stat-card {{
            background: #18181b;
            border: 1px solid #3f3f46;
            border-radius: 8px;
            padding: 20px;
            transition: transform 0.2s, border-color 0.2s;
        }}
        .stat-card:hover {{
            transform: translateY(-2px);
            border-color: #52525b;
        }}
        .stat-label {{
            color: #a1a1aa;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 8px;
        }}
        .stat-value {{
            font-size: 36px;
            font-weight: bold;
            color: #e4e4e7;
        }}
        .stat-card.pending .stat-value {{ color: #eab308; }}
        .stat-card.approved .stat-value {{ color: #22c55e; }}
        .stat-card.rejected .stat-value {{ color: #ef4444; }}
        .pending-section {{
            background: #18181b;
            border: 2px solid #3f3f46;
            border-radius: 12px;
            padding: 30px;
        }}
        .section-title {{
            font-size: 20px;
            margin-bottom: 20px;
            color: #fbbf24;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .pulse {{
            width: 12px;
            height: 12px;
            background: #fbbf24;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }}
        @keyframes pulse {{
            0%, 100% {{ opacity: 1; transform: scale(1); }}
            50% {{ opacity: 0.5; transform: scale(1.2); }}
        }}
        .task-list {{ display: flex; flex-direction: column; gap: 15px; }}
        .task-card {{
            background: #09090b;
            border: 1px solid #3f3f46;
            border-left: 4px solid #eab308;
            border-radius: 8px;
            padding: 20px;
            transition: all 0.3s;
        }}
        .task-card.high {{ border-left-color: #ef4444; }}
        .task-card.medium {{ border-left-color: #eab308; }}
        .task-card.low {{ border-left-color: #22c55e; }}
        .task-header {{
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
        }}
        .task-hash {{
            font-family: monospace;
            font-size: 11px;
            color: #71717a;
            background: #18181b;
            padding: 4px 8px;
            border-radius: 4px;
        }}
        .risk-badge {{
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
        }}
        .risk-badge.high {{ background: #7f1d1d; color: #fca5a5; }}
        .risk-badge.medium {{ background: #78350f; color: #fcd34d; }}
        .risk-badge.low {{ background: #14532d; color: #86efac; }}
        .task-intent {{
            font-size: 14px;
            color: #e4e4e7;
            margin-bottom: 15px;
            padding: 10px;
            background: #18181b;
            border-radius: 6px;
            border-left: 2px solid #3f3f46;
        }}
        .task-meta {{
            font-size: 11px;
            color: #71717a;
            margin-bottom: 15px;
        }}
        .task-actions {{
            display: flex;
            gap: 10px;
        }}
        button {{
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
        }}
        button:hover {{ transform: translateY(-1px); }}
        .btn-approve {{
            background: #22c55e;
            color: #052e16;
        }}
        .btn-approve:hover {{ background: #16a34a; }}
        .btn-reject {{
            background: #ef4444;
            color: #7f1d1d;
        }}
        .btn-reject:hover {{ background: #dc2626; }}
        .empty-state {{
            text-align: center;
            padding: 60px 20px;
            color: #71717a;
        }}
        .empty-icon {{
            font-size: 48px;
            margin-bottom: 20px;
        }}
        .refresh-btn {{
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: #3f3f46;
            color: #e4e4e7;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }}
        .refresh-btn:hover {{
            background: #52525b;
            transform: rotate(180deg);
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔒 Protocol Omega</h1>
            <p class="subtitle">Zero-Dependency Verification Dashboard | APEX-OmniHub</p>
        </header>

        <div class="stats">
            <div class="stat-card pending">
                <div class="stat-label">Pending</div>
                <div class="stat-value">{stats.get('pending', 0)}</div>
            </div>
            <div class="stat-card approved">
                <div class="stat-label">Approved</div>
                <div class="stat-value">{stats.get('approved', 0)}</div>
            </div>
            <div class="stat-card rejected">
                <div class="stat-label">Rejected</div>
                <div class="stat-value">{stats.get('rejected', 0)}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Audits</div>
                <div class="stat-value">{stats.get('total_audits', 0)}</div>
            </div>
        </div>

        <div class="pending-section">
            <div class="section-title">
                <div class="pulse"></div>
                Pending Approvals
            </div>

            <div class="task-list">
                {self.render_tasks(pending)}
            </div>
        </div>
    </div>

    <div class="refresh-btn" onclick="location.reload()" title="Refresh">
        ↻
    </div>

    <script>
        async function approveTask(hash) {{
            if (!confirm('Approve this task?')) return;

            const response = await fetch(`/api/approve/${{hash}}`, {{ method: 'POST' }});
            const result = await response.json();

            if (result.success) {{
                alert('✅ Task approved!');
                location.reload();
            }} else {{
                alert('❌ Error: ' + (result.error || 'Unknown error'));
            }}
        }}

        async function rejectTask(hash) {{
            const reason = prompt('Reason for rejection (optional):');
            if (reason === null) return; // cancelled

            const response = await fetch(`/api/reject/${{hash}}`, {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{ reason: reason || 'User rejected' }})
            }});

            const result = await response.json();

            if (result.success) {{
                alert('✅ Task rejected!');
                location.reload();
            }} else {{
                alert('❌ Error: ' + (result.error || 'Unknown error'));
            }}
        }}

        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>"""

    def render_tasks(self, tasks):
        """Render task cards HTML"""
        if not tasks:
            return """
                <div class="empty-state">
                    <div class="empty-icon">✓</div>
                    <p>No pending approvals</p>
                    <p style="margin-top: 10px; font-size: 12px;">All systems operational</p>
                </div>
            """

        html_parts = []
        for task in tasks:
            risk = task['risk_level'].upper()
            html_parts.append(f"""
                <div class="task-card {risk.lower()}">
                    <div class="task-header">
                        <div class="task-hash">{task['task_hash'][:16]}...</div>
                        <div class="risk-badge {risk.lower()}">{risk}</div>
                    </div>
                    <div class="task-intent">{task['intent']}</div>
                    <div class="task-meta">
                        Created: {task['created_at']} | Short Hash: {task['short_hash']}
                    </div>
                    <div class="task-actions">
                        <button class="btn-approve" onclick="approveTask('{task['short_hash']}')">
                            ✓ Approve
                        </button>
                        <button class="btn-reject" onclick="rejectTask('{task['short_hash']}')">
                            ✗ Reject
                        </button>
                    </div>
                </div>
            """)

        return "".join(html_parts)


def main():
    """Start the dashboard server"""
    print(f"🚀 Protocol Omega Dashboard Starting...")
    print(f"📡 Server: http://localhost:{PORT}")
    print(f"🔒 Verification Engine: {engine.db_path}")
    print(f"\nPress Ctrl+C to stop\n")

    try:
        with socketserver.TCPServer(("", PORT), OmegaDashboardHandler) as httpd:
            print(f"✅ Dashboard live at http://localhost:{PORT}/dashboard")
            print(f"📊 Stats API: http://localhost:{PORT}/api/stats")
            print(f"📋 Pending API: http://localhost:{PORT}/api/pending\n")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n🛑 Dashboard stopped")
    except OSError as e:
        print(f"\n❌ Error: {e}")
        print(f"💡 Port {PORT} may be in use. Try: lsof -i :{PORT}")


if __name__ == "__main__":
    main()
