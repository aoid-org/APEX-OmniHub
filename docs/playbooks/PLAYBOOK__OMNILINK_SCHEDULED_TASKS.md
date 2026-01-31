# PLAYBOOK: OmniLink Scheduled Tasks

> **System**: OmniLink / OmniHub  
> **Owner**: APEX SRE  
> **Status**: LIVE

## Overview

The Scheduled Tasks system allows durable, idempotent, and approval-gated execution of maintenance and operational tasks via the OmniLink universal port.

## 1. Endpoints (`/omnilink-port`)

### Create Task

`POST /tasks`
**Body**:

```json
{
  "task": {
    "title": "Rotate API Keys",
    "objective": "Rotate keys for security compliance",
    "repo": "APEX-OmniHub",
    "constraints": ["No downtime"],
    "acceptance": ["Keys rotated", "Old keys revoked"],
    "rollback": ["Restore backup"]
  },
  "run_at": "2024-01-31T12:00:00Z", // Optional (null = immediate)
  "require_approval": true, // Default: true
  "idempotency_key": "optional-uuid"
}
```

**Response**: `201 Created` with `record_id`.

### Claim Tasks (Worker)

`POST /tasks/claim`
**Body**: `{ "limit": 10, "worker_id": "prod-worker-1" }`
**Response**: `{ "tasks": [...] }`
**Note**: Uses `FOR UPDATE SKIP LOCKED` for atomic claims.

### Complete Task

`POST /tasks/complete`
**Body**:

```json
{
  "task_id": "uuid",
  "status": "succeeded", // or "failed"
  "output": { "summary": "Rotated 5 keys" }
}
```

## 2. Approval Lifecycle

1.  **Created**: Status `waiting_approval` (if `require_approval: true`).
2.  **Approval**: Admin approves via OmniDash → Status `queued`.
3.  **Claim**: Worker claims `queued` task → Status `running`.
4.  **Completion**: Worker reports success/failure → Status `succeeded` / `failed`.

## 3. Guarantees

- **Idempotency**: Enforced by DB constraint `(integration_id, idempotency_key)`.
- **Atomicity**: Claims are exclusive; no two workers can claim the same task.
- **Security**: Emergency Controls (Kill Switch) enabled for all endpoints.

## 4. Rollback / Kill Switch

See `ROLLBACK_RUNBOOK.md`.
To disable immediately:

```sql
UPDATE emergency_controls SET kill_switch = true;
```
