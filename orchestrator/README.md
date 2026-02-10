# APEX Orchestrator (Temporal.io)

**The Brain of OmniHub.**

This module houses the deterministic workflow definitions, activities, and worker configuration for the APEX operating system.

## 🧠 Architecture

The Orchestrator follows the **Tri-Force Protocol**:

1.  **Planner (Workflows)**: Deterministic logic (`/workflows`). Pure Python. No side effects.
2.  **Executor (Activities)**: Side-effect interactions (`/activities`). API calls, DB writes.
3.  **Guardian (Policies)**: Security gates (`/security`).

## 🔌 Integration Points

### New Modules (v2.2)

- **Nexus**: Knowledge Graph context provider (`nexus/`).
- **Spectre**: Simulation engine for predictive scaling (`spectre/`).
- **Aegis**: Automated defense grid and rate limiting (`aegis/`).
- **Chronos**: Time-travel debugging and replay service (`chronos/`).
- **Veritas**: Source-of-truth verification oracle (`veritas/`).

### Iron Law of Determinism

> **"If it is not deterministic, it is a bug."**

- **No** `datetime.now()` -> Use `workflow.now()`
- **No** `uuid.uuid4()` -> Use `workflow.uuid4()`
- **No** threads -> Use `workflow.start_activity()`
- **No** globals -> Pass context via arguments

## 🚀 Running the Worker

```bash
cd orchestrator
pip install -r requirements.txt
python main.py
```
