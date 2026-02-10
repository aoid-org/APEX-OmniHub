# MAN Mode (Manual Authorization Needed)

**Human-in-the-Loop Protocol for High-Stakes Operations.**

MAN Mode interrupts any workflow execution when a "Red Lane" action is attempted without pre-authorization.

## 🛡️ Logic Flow

1.  **Workflow** attempts `TransferFunds(amount=10k)`.
2.  **Aegis** intercepts call via `PolicyInterceptor`.
3.  **Risk Engine** classifies action as `RED`.
4.  **Chronos** snapshots the workflow state.
5.  **Signal** sent to OmniDash: "Approval Required".
6.  **Workflow** sleeps (`workflow.await_signal`).

## 🤝 Aegis & Chronos Integration

### Aegis Defense Grid

Aegis monitors the "Blast Radius" of every pending action.

- If `blast_radius > threshold`, MAN Mode is triggered.
- Integration: `orchestrator/aegis/policy.py`

### Chronos Replay

Chronos ensures that when the Human approves, the workflow resumes _exactly_ where it left off, with the same random seeds and time context.

- Integration: `orchestrator/chronos/replay.py`

## 📝 Configuration

```python
# orchestrator/config.py
MAN_MODE_THRESHOLDS = {
    "transfer_funds": 1000.00,
    "delete_infrastructure": True,
    "deploy_contract": True
}
```
