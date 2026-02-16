# APEX Skill Forge — Troubleshooting Guide

| Symptom                         | Root Cause               | Fix                                                                        |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| `ERROR: Invalid name`           | Non-kebab-case name      | Use `^[a-z0-9]+(-[a-z0-9]+)*$` format                                      |
| `ERROR: Invalid archetype`      | Unknown archetype        | Use one of: workflow, toolkit, domain, orchestrator, transformer, guardian |
| Audit score < 9.5               | Missing audit dimensions | Run `audit.py --verbose` to see which dimensions fail                      |
| Missing MANIFEST.json           | Incomplete scaffold      | Re-run `forge.py` to regenerate                                            |
| Claude ZIP has no SKILL.md      | Wrong format             | Use `ship.py --format claude`                                              |
| Universal ZIP has manifest.yaml | Format contamination     | Use `ship.py --format universal`                                           |
| Health check fails              | Executor import error    | Ensure `scripts/executor.py` exists and has `execute()`                    |
| OmniHub naming conflict         | Skill already installed  | Use `--force` flag or choose different name                                |
| Timeout during DAG execution    | timeout_ms too low       | Increase in MANIFEST.json `dag.timeout_ms`                                 |
| Python version error            | Python < 3.10            | Upgrade to Python 3.10+                                                    |
| Permission denied on catalog    | File not writable        | Check `config/skill_catalog.json` permissions                              |
| Empty result from executor      | Missing skill logic      | Implement `_do_execute()` in executor.py                                   |

## Common Workflow Issues

### Forge → Audit → Ship Pipeline

If audit fails after forge, the most common causes are:

1. **Missing NEVER/ALWAYS rules** in README.md → Add to anti-hallucination section
2. **No troubleshooting table** → Add symptom/cause/fix table
3. **Missing decision tree** → Add `├─` style tree to readme

### OmniHub Installation Failures

1. Ensure `--omnihub-root` points to the actual repo root (contains `package.json`)
2. The installer creates `skills/`, `config/`, `dag/` if missing
3. Health check requires `scripts/executor.py` to have `execute(input_context)` signature

---

Copyright (c) 2026 APEX Business Systems Ltd. All Rights Reserved.
