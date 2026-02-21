#!/usr/bin/env python3
"""
APEX Skill Forge v8.0 — Skill Scaffolder Engine
Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.

Generates production-grade skill directory structures with DAG metadata,
executor templates, and documentation scaffolds.

Usage:
    python forge.py <skill-name> --arch <archetype> --path <output-dir>
    python forge.py --help
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
VERSION = "8.0.0"
COPYRIGHT = "Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved."

VALID_ARCHETYPES = [
    "workflow",
    "toolkit",
    "domain",
    "orchestrator",
    "transformer",
    "guardian",
]

ARCHETYPE_NODE_TYPES: dict[str, str] = {
    "workflow": "processor",
    "toolkit": "processor",
    "domain": "processor",
    "orchestrator": "orchestrator",
    "transformer": "transformer",
    "guardian": "validator",
}

ARCHETYPE_DESCRIPTIONS: dict[str, str] = {
    "workflow": "Sequential multi-step process with validation gates",
    "toolkit": "Multi-function capability index with quick-reference",
    "domain": "Expert decision-tree system with deep domain knowledge",
    "orchestrator": "Event-driven coordinator composing multiple skills",
    "transformer": "Data pipeline with schema-based format conversion",
    "guardian": "Rules engine with audit trail for validation/security",
}

NAME_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


# ---------------------------------------------------------------------------
# Generators
# ---------------------------------------------------------------------------
def _manifest(name: str, archetype: str) -> dict[str, Any]:
    """Generate MANIFEST.json content."""
    node_type = ARCHETYPE_NODE_TYPES[archetype]
    return {
        "name": name,
        "version": "1.0.0",
        "archetype": archetype,
        "description": (
            f"Triggers: {name} execute, run {name}, invoke {name}. "
            f"Actions: process input, validate, transform. "
            f"Produces: structured result with metadata."
        ),
        "platform": "universal",
        "license": "Proprietary - APEX Business Systems Ltd.",
        "dag": {
            "node_type": node_type,
            "accepts": ["application/json", "text/plain"],
            "emits": ["event:completion", "event:failure"],
            "timeout_ms": 30000,
            "retry_policy": {"max": 3, "backoff": "exponential"},
            "idempotent": True,
            "side_effects": False,
            "omnihub_compatible": True,
            "health_check_endpoint": "/health",
            "metrics_enabled": True,
        },
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": f"apex-skill-forge v{VERSION}",
    }


def _readme(name: str, archetype: str) -> str:
    """Generate README.md content (universal, no YAML frontmatter)."""
    title = name.replace("-", " ").title()
    desc = ARCHETYPE_DESCRIPTIONS[archetype]
    return textwrap.dedent(f"""\
        # {title}

        Version: 1.0.0
        Archetype: {archetype}

        **Input**: JSON object with `execution_id`, `parameters`, `context`, `metadata`
        **Output**: Structured result with `result`, `context_updates`, `metadata`
        **Success**: executor returns `node_status: "success"` with valid result payload
        **Fails When**: invalid input schema, executor timeout, missing parameters

        ## Overview

        {desc}

        Triggers: `{name} execute`, `run {name}`, `invoke {name}`
        Actions: process input, validate, transform
        Produces: structured result with execution metadata

        ## Decision Tree

        **What do you need to do?**
        ├─ Execute skill → `python scripts/executor.py '<json>'`
        ├─ Test health → `python omnihub_integration/health_checks.py`
        ├─ View status → `python scripts/executor.py '{{"parameters":{{"action":"status"}}}}'`
        └─ Install to OmniHub → `python install_to_omnihub.py --skill-path . --omnihub-root <root>`

        ## Critical Rules

        - NEVER execute without validating input_context schema first
        - NEVER return results without execution_time_ms in metadata
        - NEVER swallow exceptions — always return error details in metadata
        - ALWAYS include node_status in response (success, error, or timeout)
        - ALWAYS propagate context_updates for downstream DAG nodes
        - ALWAYS log execution start and completion times

        ## Installation

        ### For Claude Code
        1. Package with `ship.py --format claude`
        2. Upload ZIP via Claude Settings > Capabilities

        ### For GPT-4 (OpenAI)
        1. Copy README.md content to system prompt or upload as file
        2. Reference: "Follow the {name} skill instructions"

        ### For Gemini (Google)
        1. Add README.md to Project knowledge
        2. Gemini will auto-detect skill patterns

        ### For APEX OmniHub (Direct Integration)
        ```bash
        python install_to_omnihub.py --skill-path ./{name} --omnihub-root /path/to/APEX-OmniHub
        ```

        ### For Open Models (Llama, Mistral, DeepSeek)
        1. Inject README.md into system context
        2. Invoke executor.py per your runtime

        ## Usage

        ### Python Import
        ```python
        from scripts.executor import execute

        result = execute({{
            "execution_id": "run-001",
            "parameters": {{"input": "your data"}},
            "context": {{}},
            "metadata": {{}}
        }})
        print(result)
        ```

        ### CLI Wrapper
        ```bash
        python scripts/executor.py '{{"execution_id": "run-001", "parameters": {{"input": "data"}}}}'
        ```

        ## API Reference

        **Function**: `execute(input_context: Dict[str, Any]) -> Dict[str, Any]`

        **Input**:
        | Field | Type | Description |
        |-------|------|-------------|
        | execution_id | str | Unique run identifier |
        | parameters | Dict | Skill-specific parameters |
        | context | Dict | Accumulated context from prior DAG nodes |
        | metadata | Dict | Execution metadata |

        **Output**:
        | Field | Type | Description |
        |-------|------|-------------|
        | result | Any | Primary output |
        | context_updates | Dict | State changes for next DAG node |
        | metadata | Dict | execution_time_ms, node_status, logs |

        ## Troubleshooting

        | Symptom | Cause | Fix |
        |---------|-------|-----|
        | Import error | Missing scripts/ | Verify directory structure |
        | Timeout | Long-running input | Increase dag.timeout_ms in MANIFEST.json |
        | Invalid input | Schema mismatch | Check parameters match expected types |

        ---

        {COPYRIGHT}
    """)


def _executor(name: str, archetype: str) -> str:
    """Generate scripts/executor.py template."""
    return textwrap.dedent(f"""\
        #!/usr/bin/env python3
        \"\"\"
        {name} — DAG-Compatible Executor
        {COPYRIGHT}

        APEX OmniHub DAG-compatible execution wrapper.
        Archetype: {archetype}
        \"\"\"
        from __future__ import annotations

        import json
        import os
        import sys
        import time
        from typing import Any


        def get_project_context() -> dict[str, Any]:
            \"\"\"Detect if running in Claude Code project context.\"\"\"
            root = os.getenv("CLAUDE_CODE_PROJECT_ROOT")
            if root:
                return {{"project_root": root}}
            return {{}}


        def execute(input_context: dict[str, Any]) -> dict[str, Any]:
            \"\"\"
            APEX OmniHub DAG-compatible executor.

            Args:
                input_context: {{
                    "execution_id": str,
                    "parameters": Dict[str, Any],
                    "context": Dict[str, Any],
                    "metadata": Dict[str, Any]
                }}

            Returns:
                {{
                    "result": Any,
                    "context_updates": Dict[str, Any],
                    "metadata": {{
                        "execution_time_ms": float,
                        "node_status": "success|error|timeout",
                        "logs": List[Dict],
                        "error": Optional[Dict]
                    }}
                }}
            \"\"\"
            start = time.monotonic()
            logs: list[dict[str, Any]] = []
            execution_id = input_context.get("execution_id", "unknown")
            parameters = input_context.get("parameters", {{}})
            context = input_context.get("context", {{}})

            logs.append({{"level": "info", "msg": f"Starting {{execution_id}}", "ts": time.time()}})

            try:
                # ── YOUR SKILL LOGIC HERE ──────────────────────────────
                result = {{
                    "processed": True,
                    "input_keys": list(parameters.keys()),
                    "archetype": "{archetype}",
                    "skill": "{name}",
                }}
                # ── END SKILL LOGIC ────────────────────────────────────

                elapsed = (time.monotonic() - start) * 1000
                logs.append({{"level": "info", "msg": f"Completed in {{elapsed:.1f}}ms", "ts": time.time()}})

                return {{
                    "result": result,
                    "context_updates": {{"last_skill": "{name}", "last_status": "success"}},
                    "metadata": {{
                        "execution_time_ms": round(elapsed, 2),
                        "node_status": "success",
                        "logs": logs,
                        "recoverable": True,
                    }},
                }}

            except Exception as exc:
                elapsed = (time.monotonic() - start) * 1000
                logs.append({{"level": "error", "msg": str(exc), "ts": time.time()}})
                return {{
                    "result": None,
                    "context_updates": {{"last_skill": "{name}", "last_status": "error"}},
                    "metadata": {{
                        "execution_time_ms": round(elapsed, 2),
                        "node_status": "error",
                        "logs": logs,
                        "error": {{"type": type(exc).__name__, "message": str(exc)}},
                        "recoverable": True,
                    }},
                }}


        if __name__ == "__main__":
            if len(sys.argv) > 1:
                ctx = json.loads(sys.argv[1])
            else:
                ctx = {{
                    "execution_id": "cli-test",
                    "parameters": {{"test": True}},
                    "context": {{}},
                    "metadata": {{}},
                }}
            print(json.dumps(execute(ctx), indent=2))
    """)


# ---------------------------------------------------------------------------
# Scaffolder
# ---------------------------------------------------------------------------
def create_skill(name: str, archetype: str, output_path: Path) -> bool:
    """
    Create a complete skill directory structure.

    Args:
        name: Kebab-case skill name (e.g. 'data-transformer')
        archetype: One of VALID_ARCHETYPES
        output_path: Parent directory for the skill folder

    Returns:
        True on success, False on validation failure.
    """
    # Validate name
    if not NAME_PATTERN.match(name):
        print(f"ERROR: Invalid name '{name}'. Must be kebab-case: ^[a-z0-9]+(-[a-z0-9]+)*$")
        return False

    # Validate archetype
    if archetype not in VALID_ARCHETYPES:
        print(f"ERROR: Invalid archetype '{archetype}'. Must be one of: {VALID_ARCHETYPES}")
        return False

    skill_dir = output_path / name
    scripts_dir = skill_dir / "scripts"
    refs_dir = skill_dir / "references"

    # Create directories
    scripts_dir.mkdir(parents=True, exist_ok=True)
    refs_dir.mkdir(parents=True, exist_ok=True)

    # Generate files
    manifest = _manifest(name, archetype)
    (skill_dir / "MANIFEST.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    (skill_dir / "README.md").write_text(_readme(name, archetype), encoding="utf-8")
    (scripts_dir / "executor.py").write_text(_executor(name, archetype), encoding="utf-8")
    (scripts_dir / "__init__.py").write_text(
        f'# {name} executor\n"""{COPYRIGHT}"""\n', encoding="utf-8"
    )

    # Placeholder references
    (refs_dir / "examples.md").write_text(
        f"# {name} Examples\n\nSee README.md for usage examples.\n\n{COPYRIGHT}\n",
        encoding="utf-8",
    )
    (refs_dir / "troubleshooting.md").write_text(
        f"# {name} Troubleshooting\n\nSee README.md troubleshooting table.\n\n{COPYRIGHT}\n",
        encoding="utf-8",
    )

    # License
    (skill_dir / "LICENSE").write_text(
        f"Proprietary - {COPYRIGHT}\nSee https://apexbusiness-systems.com/license\n",
        encoding="utf-8",
    )

    print(f"[OK] Skill '{name}' ({archetype}) created at: {skill_dir}")
    return True


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(
        prog="forge",
        description=f"APEX Skill Forge v{VERSION} — Skill Scaffolder Engine",
        epilog=COPYRIGHT,
    )
    parser.add_argument("name", help="Kebab-case skill name (e.g. data-transformer)")
    parser.add_argument(
        "--arch",
        required=True,
        choices=VALID_ARCHETYPES,
        help="Skill archetype",
    )
    parser.add_argument(
        "--path",
        type=Path,
        default=Path.cwd(),
        help="Output directory (default: current directory)",
    )
    args = parser.parse_args()

    success = create_skill(args.name, args.arch, args.path)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
