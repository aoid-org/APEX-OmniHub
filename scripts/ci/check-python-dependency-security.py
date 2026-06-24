#!/usr/bin/env python3
"""Regression guard: Python dependency security floors + lock consistency.

Fails CI when a security-sensitive Python package is pinned below its patched
floor, or when the same package is pinned to divergent versions across the
repo's dependency manifests/locks (stale-lock drift).

Why this exists
---------------
Dependabot alerted on aiohttp via uv.lock while orchestrator/requirements.lock
still pinned a vulnerable aiohttp (3.13.3). The locks had drifted. This guard
makes that class of defect fail fast and locally, with the exact source line.

It uses only the Python standard library so it runs in any CI image without an
install step.

Exit codes: 0 = all checks pass, 1 = at least one violation.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# --- Configuration -------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parents[2]

# Patched floor per security-sensitive package (inclusive minimum).
# aiohttp 3.14.1 fixes GHSA-xcgm-r5h9-7989, GHSA-63hw-fmq6-xxg2,
# GHSA-4fvr-rgm6-gqmc, GHSA-g3cq-j2xw-wf74, GHSA-hpj7-wq8m-9hgp,
# GHSA-4m7w-qmgq-4wj5, GHSA-9x8q-7h8h-wcw9, GHSA-2fqr-mr3j-6wp8.
SECURITY_FLOORS: dict[str, str] = {
    "aiohttp": "3.14.1",
}

# Files scanned for *exact* pins (==) and uv.lock package blocks. Relative to
# repo root. Missing files are skipped (not an error) so the guard is portable.
PIN_FILES = [
    "orchestrator/requirements.lock",
    "orchestrator/requirements.txt",
    "orchestrator/requirements.in",
    "local-agents/requirements.txt",
]
UV_LOCK_FILES = ["orchestrator/uv.lock"]

# --- Version helpers -----------------------------------------------------


def parse_version(text: str) -> tuple[int, ...]:
    """Parse a dotted numeric version into a comparable tuple.

    Trailing non-numeric segments (rc/post/dev) are ignored for the numeric
    comparison; the floor checks here only need release-level precision.
    """
    parts: list[int] = []
    for seg in text.strip().split("."):
        m = re.match(r"\d+", seg)
        if not m:
            break
        parts.append(int(m.group()))
    return tuple(parts) or (0,)


def below_floor(version: str, floor: str) -> bool:
    return parse_version(version) < parse_version(floor)


# --- Extraction ----------------------------------------------------------

# matches "aiohttp==3.14.1", "aiohttp>=3.14.1", "aiohttp == 3.14.1 \\"
PIN_RE = re.compile(
    r"^\s*(?P<name>[A-Za-z0-9_.\-]+)\s*(?P<op>==|>=)\s*"
    r"(?P<ver>[0-9][0-9A-Za-z.\-]*)"
)


def scan_pin_file(path: Path, names: set[str]) -> list[tuple[str, int, str, str, str]]:
    """Return (name, lineno, op, version, raw_line) for tracked packages."""
    found = []
    for i, line in enumerate(path.read_text().splitlines(), start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        m = PIN_RE.match(line)
        if not m:
            continue
        name = m.group("name").lower()
        if name in names:
            found.append((name, i, m.group("op"), m.group("ver"), stripped))
    return found


def scan_uv_lock(path: Path, names: set[str]) -> list[tuple[str, int, str, str, str]]:
    """Parse uv.lock [[package]] blocks for tracked packages."""
    found = []
    cur_name = None
    name_line = 0
    for i, line in enumerate(path.read_text().splitlines(), start=1):
        nm = re.match(r'^name\s*=\s*"([^"]+)"', line)
        if nm:
            cur_name = nm.group(1).lower()
            name_line = i
            continue
        vm = re.match(r'^version\s*=\s*"([^"]+)"', line)
        if vm and cur_name in names:
            found.append((cur_name, name_line, "==", vm.group(1), f'{cur_name}=={vm.group(1)}'))
            cur_name = None
    return found


# --- Main ----------------------------------------------------------------


def main() -> int:
    names = {n.lower() for n in SECURITY_FLOORS}
    violations: list[str] = []
    # package -> list of (source, exact_version) for cross-file drift detection
    exact_pins: dict[str, list[tuple[str, str]]] = {n: [] for n in names}

    scanned_any = False
    for rel in PIN_FILES + UV_LOCK_FILES:
        path = REPO_ROOT / rel
        if not path.exists():
            continue
        scanned_any = True
        is_uv = rel in UV_LOCK_FILES
        rows = scan_uv_lock(path, names) if is_uv else scan_pin_file(path, names)
        for name, lineno, op, ver, raw in rows:
            floor = SECURITY_FLOORS[name]
            src = f"{rel}:{lineno}"
            if below_floor(ver, floor):
                violations.append(
                    f"[FLOOR] {src}: {name} {op}{ver} is below patched floor "
                    f"{floor}  ->  {raw}"
                )
            if op == "==":
                exact_pins[name].append((src, ver))

    # Cross-file drift: all exact pins of a package must agree.
    for name, pins in exact_pins.items():
        distinct = {ver for _, ver in pins}
        if len(distinct) > 1:
            detail = "; ".join(f"{src}={ver}" for src, ver in pins)
            violations.append(
                f"[DRIFT] {name} pinned to divergent versions across locks: {detail}"
            )

    if not scanned_any:
        print("ERROR: no Python dependency files found to scan", file=sys.stderr)
        return 1

    if violations:
        print("Python dependency security guard FAILED:\n", file=sys.stderr)
        for v in violations:
            print(f"  {v}", file=sys.stderr)
        print(
            "\nRemediate: raise the pin to the patched floor and re-sync every lock "
            "(uv lock --upgrade-package <pkg>; refresh requirements.lock).",
            file=sys.stderr,
        )
        return 1

    floors = ", ".join(f"{n}>={v}" for n, v in SECURITY_FLOORS.items())
    print(f"Python dependency security guard PASSED ({floors}); locks consistent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
