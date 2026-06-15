#!/usr/bin/env python3
"""omniscan.py — APEX-OmniHub platform introspection utility.

Consumes JSON output from apex-omnihub-connector MCP tools and produces
a compressed platform-state snapshot in SPR format. Runs outside context
window — zero token cost to invoke.

Usage:
    python omniscan.py --health <health_json> --modules <modules_json> [options]
    python omniscan.py --stdin          # reads JSON dict from stdin
    python omniscan.py --demo           # runs with synthetic fixture data

Output: compact SPR summary to stdout (typically <200 tokens when printed).

Stdlib only — no pip installs required.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from typing import Any

# ------------------------------------------------------------------ constants
VERSION = "1.0.0"
KNOWN_MODULES = ("guardian", "planner", "executor")
CRITICAL_TABLES = ("users", "clients", "payments", "audit_log", "skill_registry")
P1_GAP_COMPONENTS = (
    "SentinelPanel",
    "NotificationCenter",
    "DashboardOverview",
    "omnilink-port",
)


# ------------------------------------------------------------------ parsers
def parse_health(raw: dict[str, Any]) -> dict[str, Any]:
    """Normalize apex_platform_health response to canonical fields."""
    return {
        "status": str(raw.get("status", raw.get("health", "UNKNOWN"))).upper(),
        "latency_ms": raw.get("latency_ms", raw.get("response_time_ms", None)),
        "checked_at": raw.get("checked_at", raw.get("timestamp", None)),
    }


def parse_modules(raw: dict[str, Any] | list[Any]) -> list[dict[str, Any]]:
    """Normalize apex_module_states response."""
    if isinstance(raw, list):
        return [{"name": str(m.get("name", "?")).lower(),
                 "state": str(m.get("state", m.get("status", "UNKNOWN"))).upper()}
                for m in raw]
    if isinstance(raw, dict):
        return [{"name": k.lower(), "state": str(v).upper()} for k, v in raw.items()]
    return []


def parse_errors(raw: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Extract P0/P1 errors from apex_error_log response."""
    critical = []
    for e in raw:
        sev = str(e.get("severity", e.get("level", "INFO"))).upper()
        if sev in ("CRITICAL", "ERROR", "P0", "P1"):
            critical.append({
                "severity": sev,
                "message": str(e.get("message", e.get("msg", "?")))[:120],
                "component": str(e.get("component", e.get("source", "?")))[:60],
                "ts": e.get("created_at", e.get("timestamp", "?")),
            })
    return critical[:10]  # cap at 10 entries for context efficiency


def parse_rls(raw: dict[str, Any] | list[Any]) -> dict[str, bool]:
    """Normalize apex_db_rls_check response to {table: rls_enabled} dict."""
    if isinstance(raw, list):
        return {str(r.get("table", r.get("tablename", "?"))): bool(r.get("rls_enabled", False))
                for r in raw}
    if isinstance(raw, dict):
        return {k: bool(v.get("rls_enabled", v) if isinstance(v, dict) else v)
                for k, v in raw.items()}
    return {}


# ------------------------------------------------------------------ scanner
def scan(data: dict[str, Any]) -> dict[str, Any]:
    """Run all scan checks and return structured findings."""
    findings: dict[str, Any] = {
        "scanned_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "version": VERSION,
        "platform_status": "UNKNOWN",
        "modules": [],
        "critical_errors": [],
        "rls_gaps": [],
        "p1_gaps_detected": [],
        "security_flags": [],
        "summary": "",
    }

    # Health
    if "health" in data:
        h = parse_health(data["health"])
        findings["platform_status"] = h["status"]
        findings["health_latency_ms"] = h["latency_ms"]

    # Module states
    if "modules" in data:
        modules = parse_modules(data["modules"])
        findings["modules"] = modules
        offline = [m["name"] for m in modules if m["state"] not in ("ACTIVE", "RUNNING", "OK")]
        if offline:
            findings["security_flags"].append(f"MODULES_DEGRADED: {offline}")

    # Critical errors
    if "errors" in data:
        findings["critical_errors"] = parse_errors(data["errors"])

    # RLS audit
    if "rls" in data:
        rls_map = parse_rls(data["rls"])
        for table in CRITICAL_TABLES:
            if table in rls_map and not rls_map[table]:
                findings["rls_gaps"].append(table)
                findings["security_flags"].append(f"RLS_DISABLED: {table}")

    # P1 gap detection (from known components in error/audit data)
    if "audit" in data:
        for entry in data.get("audit", []):
            msg = str(entry.get("message", "")).lower()
            for comp in P1_GAP_COMPONENTS:
                if comp.lower() in msg and comp not in findings["p1_gaps_detected"]:
                    findings["p1_gaps_detected"].append(comp)

    # Security: scan for credential patterns in any string fields
    raw_str = json.dumps(data)
    cred_patterns = ["service_role", "eyJh", "ghp_", "sk-", "APEX_MCP_CONNECTOR_TOKEN"]
    for pat in cred_patterns:
        if pat in raw_str:
            findings["security_flags"].append(f"CREDENTIAL_PATTERN_DETECTED: {pat}")

    # Build summary (SPR format — compact)
    status = findings["platform_status"]
    module_str = ", ".join(f"{m['name']}:{m['state']}" for m in findings["modules"]) or "not-checked"
    error_count = len(findings["critical_errors"])
    rls_gap_str = ", ".join(findings["rls_gaps"]) or "none"
    flag_count = len(findings["security_flags"])

    findings["summary"] = (
        f"STATUS:{status} | MODULES:[{module_str}] | "
        f"P0_P1_ERRORS:{error_count} | RLS_GAPS:[{rls_gap_str}] | "
        f"SECURITY_FLAGS:{flag_count}"
    )
    return findings


# ------------------------------------------------------------------ output
def render_spr(findings: dict[str, Any]) -> str:
    """Render findings as an SPR-format string for context injection."""
    lines = [
        f"OMNISCAN v{findings['version']} · {findings['scanned_utc']}",
        f"PLATFORM: {findings['platform_status']}",
    ]
    if findings["modules"]:
        lines.append("MODULES: " + " · ".join(
            f"{m['name']}={m['state']}" for m in findings["modules"]))
    if findings["critical_errors"]:
        lines.append(f"CRITICAL_ERRORS ({len(findings['critical_errors'])}):")
        for e in findings["critical_errors"][:3]:
            lines.append(f"  [{e['severity']}] {e['component']}: {e['message']}")
    if findings["rls_gaps"]:
        lines.append(f"RLS_GAPS (HARD STOP): {', '.join(findings['rls_gaps'])}")
    if findings["security_flags"]:
        lines.append(f"SECURITY_FLAGS ({len(findings['security_flags'])}):")
        for f in findings["security_flags"]:
            lines.append(f"  !! {f}")
    if findings["p1_gaps_detected"]:
        lines.append(f"P1_GAPS: {', '.join(findings['p1_gaps_detected'])}")
    lines.append(f"SUMMARY: {findings['summary']}")
    return "\n".join(lines)


# ------------------------------------------------------------------ demo fixture
DEMO_DATA: dict[str, Any] = {
    "health": {"status": "healthy", "latency_ms": 42},
    "modules": [
        {"name": "guardian", "state": "ACTIVE"},
        {"name": "planner", "state": "ACTIVE"},
        {"name": "executor", "state": "ACTIVE"},
    ],
    "errors": [],
    "rls": {
        "users": {"rls_enabled": True},
        "clients": {"rls_enabled": True},
        "payments": {"rls_enabled": True},
        "audit_log": {"rls_enabled": True},
        "skill_registry": {"rls_enabled": True},
    },
    "audit": [],
}


# ------------------------------------------------------------------ main
def main() -> int:
    ap = argparse.ArgumentParser(
        prog="omniscan.py",
        description="APEX-OmniHub platform introspection — produces SPR snapshot.",
    )
    ap.add_argument("--health", type=str, default=None, help="JSON string from apex_platform_health")
    ap.add_argument("--modules", type=str, default=None, help="JSON string from apex_module_states")
    ap.add_argument("--errors", type=str, default=None, help="JSON string from apex_error_log")
    ap.add_argument("--rls", type=str, default=None, help="JSON string from apex_db_rls_check")
    ap.add_argument("--audit", type=str, default=None, help="JSON string from apex_audit_log")
    ap.add_argument("--stdin", action="store_true", help="Read JSON dict from stdin")
    ap.add_argument("--demo", action="store_true", help="Run with synthetic fixture data")
    ap.add_argument("--json", action="store_true", help="Output full JSON instead of SPR text")
    args = ap.parse_args()

    if args.demo:
        data = DEMO_DATA
    elif args.stdin:
        try:
            data = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(f"ERROR: invalid JSON on stdin: {e}", file=sys.stderr)
            return 2
    else:
        data: dict[str, Any] = {}
        for key, val in (
            ("health", args.health),
            ("modules", args.modules),
            ("errors", args.errors),
            ("rls", args.rls),
            ("audit", args.audit),
        ):
            if val:
                try:
                    data[key] = json.loads(val)
                except json.JSONDecodeError as e:
                    print(f"ERROR: invalid JSON for --{key}: {e}", file=sys.stderr)
                    return 2

    findings = scan(data)

    if args.json:
        print(json.dumps(findings, indent=2))
    else:
        print(render_spr(findings))

    # Exit code signals health to calling agent
    if findings["security_flags"]:
        return 2  # security flags = immediate attention
    if findings["platform_status"] not in ("HEALTHY", "OK", "UNKNOWN"):
        return 1  # degraded platform
    return 0


if __name__ == "__main__":
    sys.exit(main())
