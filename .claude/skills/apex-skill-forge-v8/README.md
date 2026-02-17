# APEX Skill Forge v8.0

**20x Skill Engineering System — Works with ANY LLM**

Version: 8.0.0
Archetype: orchestrator

**Input**: Skill name (kebab-case) + archetype + optional parameters
**Output**: Complete skill packages (README, MANIFEST.json, executor.py, references/)
**Success**: All packages pass 12-dimension audit with >= 9.5/10 average score
**Fails When**: Invalid name format, unknown archetype, audit score below threshold

## Overview

A **model-agnostic skill engineering system** that scaffolds, validates, and packages production-grade AI skills for any platform. Evolves the v4.0 UNIVERSAL_PROMPT.md into a full executable engine with DAG integration.

Triggers: `forge skill`, `create skill`, `build skill`, `scaffold skill`, `package skill`, `audit skill`, `ship skill`
Actions: scaffold 6 archetypes, DAG-compatible execution, 12-dimension audit, tri-format packaging
Produces: production-grade skill packages for Claude, Universal LLM, and APEX OmniHub

## Critical Rules

- NEVER generate skills without MANIFEST.json (DAG metadata is mandatory)
- NEVER use non-kebab-case names (enforce `^[a-z0-9]+(-[a-z0-9]+)*$`)
- NEVER skip audit validation (all packages MUST score >= 9.5/10)
- ALWAYS include copyright: "Copyright (c) 2026 APEX Business Systems Ltd."
- ALWAYS generate executor.py with DAG-compatible `execute()` signature
- ALWAYS include timeout_ms, retry_policy, idempotent in DAG metadata

## Installation

### For Claude Code

1. Package with `python scripts/ship.py . --format claude`
2. Upload ZIP via Claude Settings > Capabilities > Upload skill
3. Verify in Skills list

### For GPT-4 (OpenAI)

1. Package with `python scripts/ship.py . --format universal`
2. Extract README.md from the ZIP
3. Paste content to system prompt or upload as file
4. Reference: "Follow the apex-skill-forge instructions"

### For Gemini (Google)

1. Extract README.md from the universal ZIP
2. Create new Project in Gemini
3. Add README.md to Project knowledge
4. Gemini will auto-detect skill patterns

### For APEX OmniHub (Direct Integration)

```bash
python install_to_omnihub.py \
  --skill-path ./apex-skill-forge \
  --omnihub-root /path/to/APEX-OmniHub \
  --register-in-catalog
```

### For Open Models (Llama, Mistral, DeepSeek)

1. Inject README.md into system context
2. Invoke executor.py per your runtime wrapper

## Quick Start

### 1. Forge a New Skill

```bash
python scripts/forge.py data-transformer --arch transformer --path ./my-skills
```

### 2. Audit It

```bash
python scripts/audit.py ./my-skills/data-transformer --verbose
```

### 3. Package It

```bash
# For Claude
python scripts/ship.py ./my-skills/data-transformer --format claude

# For any LLM
python scripts/ship.py ./my-skills/data-transformer --format universal

# For OmniHub
python scripts/ship.py ./my-skills/data-transformer --format omnihub
```

### Python Import Example

```python
from scripts.executor import execute

result = execute({
    "execution_id": "run-001",
    "parameters": {"action": "status"},
    "context": {},
    "metadata": {}
})
print(result)
```

## Archetypes

| Archetype        | DAG Node     | Description                                           |
| ---------------- | ------------ | ----------------------------------------------------- |
| **workflow**     | processor    | Sequential multi-step processes with validation gates |
| **toolkit**      | processor    | Multi-function capability index with quick-reference  |
| **domain**       | processor    | Expert decision-tree system with deep knowledge       |
| **orchestrator** | orchestrator | Event-driven coordinator composing multiple skills    |
| **transformer**  | transformer  | Data pipeline with schema-based format conversion     |
| **guardian**     | validator    | Rules engine with audit trail for validation/security |

## API Reference

**Core Function**: `execute(input_context: Dict[str, Any]) -> Dict[str, Any]`

**Input**:
| Field | Type | Description |
|-------|------|-------------|
| execution_id | str | Unique run identifier |
| parameters | Dict | `action`: status/forge/audit/ship + skill params |
| context | Dict | Accumulated context from prior DAG nodes |
| metadata | Dict | timeout_ms, retry overrides |

**Output**:
| Field | Type | Description |
|-------|------|-------------|
| result | Any | Primary output (forged skill info, audit report, etc.) |
| context_updates | Dict | State changes propagated to next DAG node |
| metadata.execution_time_ms | float | Elapsed time |
| metadata.node_status | str | success, error, or timeout |
| metadata.logs | List | Timestamped execution log entries |
| metadata.recoverable | bool | Whether error is retryable |

## DAG MANIFEST Schema

```json
{
  "name": "skill-name",
  "version": "1.0.0",
  "archetype": "workflow",
  "dag": {
    "node_type": "processor",
    "accepts": ["application/json", "text/plain"],
    "emits": ["event:completion", "event:failure"],
    "timeout_ms": 30000,
    "retry_policy": { "max": 3, "backoff": "exponential" },
    "idempotent": true,
    "side_effects": false,
    "omnihub_compatible": true
  }
}
```

## 12-Dimension Audit

| #   | Dimension                    | Target |
| --- | ---------------------------- | ------ |
| 1   | Manifest completeness        | 10/10  |
| 2   | Trigger clarity (3+ phrases) | 9.5+   |
| 3   | I/O schema definition        | 10/10  |
| 4   | Execution path docs          | 9.5+   |
| 5   | Anti-hallucination guards    | 10/10  |
| 6   | Usage examples               | 9.5+   |
| 7   | Failure mode handling        | 9.5+   |
| 8   | DAG compatibility            | 10/10  |
| 9   | Script determinism           | 10/10  |
| 10  | Dependencies declared        | 10/10  |
| 11  | License/copyright            | 10/10  |
| 12  | Versioning (semver)          | 10/10  |

**Threshold: >= 9.5/10 average**

## Package Contents

```
apex-skill-forge-v8/
├── SKILL.md                    # Claude-native (with YAML frontmatter)
├── README.md                   # This file (universal)
├── MANIFEST.json               # DAG metadata (universal)
├── manifest.yaml               # Claude Skills spec
├── LLM_COMPATIBILITY.md        # Per-LLM usage guide
├── LICENSE                     # Proprietary
├── install_to_omnihub.py       # OmniHub auto-installer
├── scripts/
│   ├── forge.py                # Skill scaffolder
│   ├── executor.py             # DAG-compatible executor
│   ├── audit.py                # 12-dimension validator
│   └── ship.py                 # Tri-format packager
├── references/
│   ├── examples.md             # Archetype examples
│   └── troubleshooting.md      # Issue resolution
└── omnihub_integration/
    ├── health_checks.py        # Runtime health validator
    └── dag_registry.json       # Skill registration schema
```

## Troubleshooting

| Symptom                     | Cause                 | Fix                         |
| --------------------------- | --------------------- | --------------------------- |
| Name validation error       | Non-kebab-case        | Use format: `my-skill-name` |
| Audit score < 9.5           | Incomplete dimensions | Run `audit.py --verbose`    |
| Claude ZIP missing SKILL.md | Wrong format flag     | Use `--format claude`       |
| Universal ZIP has YAML      | Format contamination  | Re-run `--format universal` |
| OmniHub health check fails  | Missing executor      | Check `scripts/executor.py` |
| Import error in executor    | Python < 3.10         | Upgrade to Python 3.10+     |
| Timeout in DAG              | Long-running task     | Increase `dag.timeout_ms`   |

## System Requirements

- Python 3.10+ (stdlib only, no external dependencies)
- Any LLM that supports long prompts (~8K tokens)

---

**Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.**
Edmonton, Alberta, Canada — https://apexbusiness-systems.com
