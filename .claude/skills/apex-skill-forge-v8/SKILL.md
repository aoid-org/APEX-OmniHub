---
name: apex-skill-forge
archetype: orchestrator
version: 8.0.0
description: "Triggers: forge skill, create skill, build skill, scaffold skill, package skill, audit skill, ship skill. Actions: scaffold 6 archetypes, DAG-compatible execution, 12-dimension audit, tri-format packaging. Produces: production-grade skill packages for Claude, Universal LLM, and APEX OmniHub."
context_budget: medium
---

# APEX Skill Forge v8.0

> **One command. Any archetype. Three distribution formats. Zero guesswork.**

**Input**: Skill name (kebab-case) + archetype + optional parameters
**Output**: Complete skill package (README, MANIFEST.json, executor.py, references/)
**Success**: Forged skill scores >= 9.5/10 on 12-dimension audit
**Fails When**: Invalid name format, unknown archetype, missing output path

---

## I. Decision Router (Start Here)

| Task                    | Action                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| **Create a new skill**  | `python scripts/forge.py <name> --arch <type> --path <dir>`             |
| **Validate a skill**    | `python scripts/audit.py <skill-dir> --verbose`                         |
| **Package for Claude**  | `python scripts/ship.py <skill-dir> --format claude`                    |
| **Package for any LLM** | `python scripts/ship.py <skill-dir> --format universal`                 |
| **Install to OmniHub**  | `python install_to_omnihub.py --skill-path <dir> --omnihub-root <root>` |
| **Check DAG status**    | `python scripts/executor.py '{"parameters":{"action":"status"}}'`       |

---

## II. Archetypes

| Archetype        | DAG Node Type | Use When                        |
| ---------------- | ------------- | ------------------------------- |
| **workflow**     | processor     | Sequential multi-step processes |
| **toolkit**      | processor     | Multi-function capability index |
| **domain**       | processor     | Expert decision-tree systems    |
| **orchestrator** | orchestrator  | Coordinating multiple skills    |
| **transformer**  | transformer   | Data format conversion          |
| **guardian**     | validator     | Validation / security gates     |

---

## III. Critical Rules (Anti-Hallucination)

- NEVER generate skills without MANIFEST.json (DAG metadata is mandatory)
- NEVER use non-kebab-case names (enforce `^[a-z0-9]+(-[a-z0-9]+)*$`)
- NEVER skip audit validation (all packages MUST score >= 9.5/10)
- NEVER hardcode paths (use `Path` objects and relative paths)
- NEVER mix Claude-specific syntax into universal packages
- ALWAYS include copyright: "Copyright (c) 2026 APEX Business Systems Ltd."
- ALWAYS generate executor.py with DAG-compatible `execute()` signature
- ALWAYS include timeout_ms, retry_policy, idempotent in DAG metadata

---

## IV. Forge Protocol (Execution Flow)

```
1. VALIDATE   → Name regex + archetype check
2. SCAFFOLD   → Create directory: skills/<name>/
3. GENERATE   → README.md + MANIFEST.json + scripts/executor.py
4. POPULATE   → references/ + LICENSE
5. AUDIT      → Run 12-dimension validator (>= 9.5 required)
6. SHIP       → Package to target format (claude/universal/omnihub)
```

### Generated Directory Structure

```
<skill-name>/
├── README.md           # Universal documentation
├── MANIFEST.json       # DAG metadata + skill config
├── LICENSE             # APEX Business Systems Ltd.
├── scripts/
│   ├── __init__.py
│   └── executor.py     # DAG-compatible execute() entry point
└── references/
    ├── examples.md
    └── troubleshooting.md
```

---

## V. DAG Executor Contract

```python
def execute(input_context: dict[str, Any]) -> dict[str, Any]:
    """
    input_context: {
        "execution_id": str,
        "parameters": Dict,
        "context": Dict,      # From prior DAG nodes
        "metadata": Dict
    }
    Returns: {
        "result": Any,
        "context_updates": Dict,  # State for next node
        "metadata": {
            "execution_time_ms": float,
            "node_status": "success|error|timeout",
            "logs": List[Dict],
            "recoverable": bool
        }
    }
    """
```

---

## VI. MANIFEST.json Schema (Required DAG Fields)

```json
{
  "name": "skill-name",
  "version": "1.0.0",
  "archetype": "workflow",
  "description": "Triggers: ... Actions: ... Produces: ...",
  "dag": {
    "node_type": "processor|orchestrator|validator|transformer",
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

---

## VII. 12-Dimension Audit

| #   | Dimension             | Weight                       | Target |
| --- | --------------------- | ---------------------------- | ------ |
| 1   | Manifest completeness | name+version+archetype+dag   | 10/10  |
| 2   | Trigger clarity       | 3+ trigger phrases           | 9.5+   |
| 3   | I/O schema            | Input/Output/Success defined | 10/10  |
| 4   | Execution paths       | Decision trees present       | 9.5+   |
| 5   | Anti-hallucination    | NEVER/ALWAYS rules           | 10/10  |
| 6   | Usage examples        | Python + CLI examples        | 9.5+   |
| 7   | Failure modes         | Troubleshooting table        | 9.5+   |
| 8   | DAG compatibility     | timeout, retry, idempotent   | 10/10  |
| 9   | Script determinism    | Single execute() entry       | 10/10  |
| 10  | Dependencies          | Declared or stdlib-only      | 10/10  |
| 11  | License/copyright     | Present in all files         | 10/10  |
| 12  | Versioning            | Semantic x.y.z               | 10/10  |

**Aggregate threshold: >= 9.5/10 average**

---

## VIII. Tri-Format Packaging

| Format        | Root File                   | Metadata          | Extra                                    |
| ------------- | --------------------------- | ----------------- | ---------------------------------------- |
| **Claude**    | SKILL.md (YAML frontmatter) | manifest.yaml     | Claude progressive disclosure            |
| **Universal** | README.md (no frontmatter)  | MANIFEST.json     | LLM_COMPATIBILITY.md                     |
| **OmniHub**   | README.md + MANIFEST.json   | dag_registry.json | install_to_omnihub.py + health_checks.py |

---

## IX. Scripts Reference

```bash
# Scaffold a new skill
python scripts/forge.py data-transformer --arch transformer --path ./skills

# Audit a skill (verbose)
python scripts/audit.py ./skills/data-transformer --verbose --threshold 9.5

# Package for Claude
python scripts/ship.py ./skills/data-transformer --format claude

# Package for universal distribution
python scripts/ship.py ./skills/data-transformer --format universal

# Package for OmniHub
python scripts/ship.py ./skills/data-transformer --format omnihub

# Run executor status check
python scripts/executor.py '{"parameters":{"action":"status"}}'
```

---

## X. Troubleshooting

| Symptom                     | Cause                | Fix                                   |
| --------------------------- | -------------------- | ------------------------------------- |
| Name validation error       | Non-kebab-case       | Use `^[a-z0-9]+(-[a-z0-9]+)*$`        |
| Audit score < 9.5           | Missing dimensions   | Run `audit.py --verbose` for details  |
| Claude ZIP missing SKILL.md | Wrong format flag    | Use `--format claude`                 |
| Universal ZIP has YAML      | Format contamination | Re-run `--format universal`           |
| OmniHub health check fails  | Missing executor     | Verify `scripts/executor.py` exists   |
| Timeout in DAG              | Long input           | Increase `dag.timeout_ms` in MANIFEST |

---

_APEX Skill Forge v8.0 — Patent Pending._
_Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved._
_Edmonton, AB, Canada — https://apexbusiness-systems.com_
