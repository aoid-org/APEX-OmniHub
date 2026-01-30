#!/usr/bin/env python3
"""
APEX-OmniHub Protocol Omega - Zero-Dependency Verification Engine
Uses ONLY Python standard library (sqlite3, hashlib, json, datetime)
"""

import sqlite3
import hashlib
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Configuration
OMEGA_DIR = Path.home() / ".apex" / "omega"
DB_PATH = OMEGA_DIR / "verification.db"

class OmegaEngine:
    """Stateful verification engine using SQLite (stdlib only)"""

    def __init__(self, db_path: Path = DB_PATH):
        self.db_path = db_path
        self._ensure_db()

    def _ensure_db(self):
        """Initialize database with WAL mode for concurrency"""
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        conn = sqlite3.connect(str(self.db_path))
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS verifications (
                task_hash TEXT PRIMARY KEY,
                intent TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                status TEXT DEFAULT 'PENDING',
                context TEXT,
                created_at TEXT NOT NULL,
                approved_at TEXT,
                approved_by TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_hash TEXT NOT NULL,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                metadata TEXT
            )
        """)
        conn.commit()
        conn.close()

    def _hash_intent(self, intent: str) -> str:
        """Generate deterministic hash for intent"""
        return hashlib.sha256(intent.encode('utf-8')).hexdigest()

    def request_approval(self, intent: str, risk_level: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Request approval for an action"""
        task_hash = self._hash_intent(intent)

        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Check if already exists
        existing = cursor.execute(
            "SELECT status FROM verifications WHERE task_hash = ?",
            (task_hash,)
        ).fetchone()

        if existing:
            status = existing[0]
            conn.close()
            return {
                "status": status,
                "task_hash": task_hash,
                "short_hash": task_hash[:8],
                "exists": True
            }

        # Insert new request
        cursor.execute("""
            INSERT INTO verifications (task_hash, intent, risk_level, context, created_at, status)
            VALUES (?, ?, ?, ?, ?, 'PENDING')
        """, (
            task_hash,
            intent,
            risk_level,
            json.dumps(context) if context else None,
            datetime.utcnow().isoformat()
        ))

        # Audit log
        cursor.execute("""
            INSERT INTO audit_log (task_hash, action, timestamp, metadata)
            VALUES (?, 'REQUEST', ?, ?)
        """, (
            task_hash,
            datetime.utcnow().isoformat(),
            json.dumps({"risk_level": risk_level})
        ))

        conn.commit()
        conn.close()

        return {
            "status": "PENDING",
            "task_hash": task_hash,
            "short_hash": task_hash[:8],
            "exists": False,
            "intent": intent,
            "risk_level": risk_level
        }

    def check_approval(self, intent: str) -> Dict[str, Any]:
        """Check if action is approved"""
        task_hash = self._hash_intent(intent)

        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        row = cursor.execute("""
            SELECT status, approved_at, approved_by
            FROM verifications
            WHERE task_hash = ?
        """, (task_hash,)).fetchone()

        conn.close()

        if not row:
            return {
                "approved": False,
                "status": "NOT_FOUND",
                "task_hash": task_hash,
                "short_hash": task_hash[:8]
            }

        status, approved_at, approved_by = row

        return {
            "approved": status == "APPROVED",
            "status": status,
            "task_hash": task_hash,
            "short_hash": task_hash[:8],
            "approved_at": approved_at,
            "approved_by": approved_by
        }

    def approve(self, task_hash: str, approved_by: str = "cli") -> Dict[str, Any]:
        """Approve a task by hash (full or short)"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Support short hash (first 8 chars)
        if len(task_hash) == 8:
            matching = cursor.execute("""
                SELECT task_hash FROM verifications
                WHERE task_hash LIKE ?
            """, (task_hash + '%',)).fetchall()

            if len(matching) == 0:
                conn.close()
                return {"success": False, "error": "Task not found"}
            elif len(matching) > 1:
                conn.close()
                return {"success": False, "error": f"Ambiguous hash: {len(matching)} matches"}

            task_hash = matching[0][0]

        # Update status
        cursor.execute("""
            UPDATE verifications
            SET status = 'APPROVED', approved_at = ?, approved_by = ?
            WHERE task_hash = ?
        """, (datetime.utcnow().isoformat(), approved_by, task_hash))

        # Audit log
        cursor.execute("""
            INSERT INTO audit_log (task_hash, action, timestamp, metadata)
            VALUES (?, 'APPROVE', ?, ?)
        """, (task_hash, datetime.utcnow().isoformat(), json.dumps({"by": approved_by})))

        conn.commit()
        affected = cursor.rowcount
        conn.close()

        if affected == 0:
            return {"success": False, "error": "Task not found"}

        return {
            "success": True,
            "task_hash": task_hash,
            "short_hash": task_hash[:8],
            "approved_at": datetime.utcnow().isoformat()
        }

    def reject(self, task_hash: str, reason: str = "User rejected") -> Dict[str, Any]:
        """Reject a task"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        # Support short hash
        if len(task_hash) == 8:
            matching = cursor.execute(
                "SELECT task_hash FROM verifications WHERE task_hash LIKE ?",
                (task_hash + '%',)
            ).fetchall()

            if len(matching) == 1:
                task_hash = matching[0][0]

        cursor.execute("""
            UPDATE verifications
            SET status = 'REJECTED'
            WHERE task_hash = ?
        """, (task_hash,))

        cursor.execute("""
            INSERT INTO audit_log (task_hash, action, timestamp, metadata)
            VALUES (?, 'REJECT', ?, ?)
        """, (task_hash, datetime.utcnow().isoformat(), json.dumps({"reason": reason})))

        conn.commit()
        conn.close()

        return {"success": True, "task_hash": task_hash}

    def list_pending(self) -> list:
        """List all pending approvals"""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        rows = cursor.execute("""
            SELECT task_hash, intent, risk_level, created_at
            FROM verifications
            WHERE status = 'PENDING'
            ORDER BY created_at DESC
        """).fetchall()

        conn.close()

        return [
            {
                "task_hash": row["task_hash"],
                "short_hash": row["task_hash"][:8],
                "intent": row["intent"],
                "risk_level": row["risk_level"],
                "created_at": row["created_at"]
            }
            for row in rows
        ]

    def get_stats(self) -> Dict[str, Any]:
        """Get verification statistics"""
        conn = sqlite3.connect(str(self.db_path))
        cursor = conn.cursor()

        stats = {}

        # Count by status
        for status in ['PENDING', 'APPROVED', 'REJECTED']:
            count = cursor.execute(
                "SELECT COUNT(*) FROM verifications WHERE status = ?",
                (status,)
            ).fetchone()[0]
            stats[status.lower()] = count

        # Total audits
        stats['total_audits'] = cursor.execute(
            "SELECT COUNT(*) FROM audit_log"
        ).fetchone()[0]

        conn.close()
        return stats


def main():
    """CLI interface for omega engine"""
    engine = OmegaEngine()

    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: engine.py <command> [args]",
            "commands": ["request", "check", "approve", "reject", "list", "stats"]
        }))
        sys.exit(1)

    command = sys.argv[1]

    if command == "request":
        if len(sys.argv) < 4:
            print(json.dumps({"error": "Usage: request <intent> <risk_level> [context_json]"}))
            sys.exit(1)

        intent = sys.argv[2]
        risk_level = sys.argv[3]
        context = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None

        result = engine.request_approval(intent, risk_level, context)
        print(json.dumps(result, indent=2))

    elif command == "check":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Usage: check <intent>"}))
            sys.exit(1)

        result = engine.check_approval(sys.argv[2])
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["approved"] else 1)

    elif command == "approve":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Usage: approve <task_hash>"}))
            sys.exit(1)

        result = engine.approve(sys.argv[2])
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["success"] else 1)

    elif command == "reject":
        if len(sys.argv) < 3:
            print(json.dumps({"error": "Usage: reject <task_hash> [reason]"}))
            sys.exit(1)

        reason = sys.argv[3] if len(sys.argv) > 3 else "User rejected"
        result = engine.reject(sys.argv[2], reason)
        print(json.dumps(result, indent=2))

    elif command == "list":
        result = engine.list_pending()
        print(json.dumps(result, indent=2))

    elif command == "stats":
        result = engine.get_stats()
        print(json.dumps(result, indent=2))

    else:
        print(json.dumps({"error": f"Unknown command: {command}"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
