# OmniHub Local Agent Connectors

This directory contains Python connector modules for integrating local machines (Lead-Gen + APEX-Sales) with OmniHub via OmniLink Port.

## Architecture

```
┌─────────────────────────────────────────┐
│         OmniHub Control Plane           │
│  ┌───────────────┐  ┌────────────────┐  │
│  │  OmniDash UI  │  │  OmniLink Port │  │
│  │  (Analytics + │  │  (Edge Func)   │  │
│  │   Tasks UI)   │  │                │  │
│  └───────────────┘  └────────────────┘  │
│           │                  │           │
│           └──────┬───────────┘           │
│                  │                       │
└──────────────────┼───────────────────────┘
                   │ HTTPS (Single Front Door)
        ┌──────────┼──────────┐
        │          │          │
┌───────▼─────┐ ┌──▼──────────▼────┐
│  Lead-Gen   │ │   APEX-Sales     │
│  (Local)    │ │   (Local)        │
│             │ │                  │
│ - Ingest    │ │ - Call Attempts  │
│ - Qualify   │ │ - Connections    │
│ - Queue     │ │ - Bookings       │
└─────────────┘ └──────────────────┘
```

## Files

- **omnihub_connector.py**: Shared connector module with `OmniHubConnector` and `TaskWorker` classes
- **lead_gen_agent.py**: Lead-Gen machine implementation
- **apex_sales_agent.py**: APEX-Sales machine implementation
- **.env.example**: Example environment configuration

## Setup

### 1. Install Dependencies

```bash
pip install aiohttp
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your OmniHub credentials
```

Required variables:
- `OMNIHUB_BASE_URL`: Your Supabase functions URL (e.g., `https://xxx.supabase.co/functions/v1`)
- `OMNIHUB_API_KEY`: OmniLink API key (create in OmniDash → Integrations)
- `OMNIHUB_SOURCE`: Source identifier (`lead-gen` or `apex-sales`)
- `OMNIHUB_WORKER_ID`: Unique worker ID for this machine

### 3. Create OmniLink API Key

1. Navigate to OmniDash → Integrations
2. Create a new integration (if needed)
3. Generate an API key with scopes:
   - `events:write` (for telemetry)
   - `tasks:create` (optional, for creating tasks)
   - `tasks:claim` (for claiming tasks)
   - `tasks:complete` (for completing tasks)
4. Copy the API key (shown only once!) to your `.env` file

## Usage

### Lead-Gen Agent

**Simulate lead ingestion (one-time)**:
```bash
python lead_gen_agent.py
# Emits 14 lead events to OmniHub, then exits
```

**Run as task worker**:
```bash
LEAD_GEN_MODE=worker python lead_gen_agent.py
# Continuously polls for tasks and executes them
```

**Hybrid mode**:
```bash
LEAD_GEN_MODE=hybrid python lead_gen_agent.py
# Simulates ingestion, then runs worker loop for 1 minute
```

### APEX-Sales Agent

**Simulate outbound calls (one-time)**:
```bash
python apex_sales_agent.py
# Emits 10 call attempt events (with random outcomes), then exits
```

**Run as task worker**:
```bash
APEX_SALES_MODE=worker python apex_sales_agent.py
# Continuously polls for tasks and executes them
```

**Hybrid mode**:
```bash
APEX_SALES_MODE=hybrid python apex_sales_agent.py
# Simulates calls, then runs worker loop for 1 minute
```

## Verification

### 1. Emit Telemetry

Run both agents in simulate mode:
```bash
# Terminal 1: Lead-Gen
export OMNIHUB_SOURCE=lead-gen
export OMNIHUB_WORKER_ID=lead-gen-dev-01
python lead_gen_agent.py

# Terminal 2: APEX-Sales
export OMNIHUB_SOURCE=apex-sales
export OMNIHUB_WORKER_ID=apex-sales-dev-01
python apex_sales_agent.py
```

### 2. View Analytics

Navigate to OmniDash: `http://localhost:5173/omnidash/local-agents`

You should see:
- **Lead-Gen panel**: Ingested leads, qualified leads, queue size, qualification rate
- **APEX-Sales panel**: Call attempts, connections, bookings, connection rate, booking rate
- **Recent Events**: Live event stream from both sources

### 3. Dispatch Tasks

1. Navigate to `http://localhost:5173/omnidash/tasks`
2. Click "Create Task"
3. Fill in:
   - **Target**: `apex-sales` or `lead-gen`
   - **Action**: `echo` (test action)
   - **Payload**: `{"message": "hello from OmniHub"}`
   - **Require Approval**: Check if you want manual approval
4. Click "Create Task"

### 4. Claim and Execute Tasks

Run worker in another terminal:
```bash
APEX_SALES_MODE=worker python apex_sales_agent.py
# or
LEAD_GEN_MODE=worker python lead_gen_agent.py
```

The worker will:
1. Poll for tasks every 5 seconds
2. Claim the task (atomically, concurrency-safe)
3. Execute the task handler
4. Complete the task with output

Check the Tasks UI to see status transitions:
- `queued` → `running` → `succeeded` (or `failed`)

## Task Handlers

### Built-in Handlers

**Lead-Gen**:
- `echo`: Echo the payload back
- `refresh_queue`: Simulate queue refresh

**APEX-Sales**:
- `echo`: Echo the payload back
- `call_lead`: Initiate a call to a specific lead

### Adding Custom Handlers

Edit the agent script and register new handlers:

```python
def handle_custom_action(task: Dict[str, Any]) -> Dict[str, Any]:
    params = task.get('params', {})
    payload = params.get('payload', {})

    # Your custom logic here
    result = do_something(payload)

    return {
        "action": "custom_action",
        "result": result,
        "message": "Custom action completed successfully",
    }

# Register the handler
handlers = {
    'echo': handle_echo,
    'custom_action': handle_custom_action,
}

worker = TaskWorker(connector, handlers)
worker.run()
```

## Rollback / Kill-Switch

### Emergency Stop

If you need to stop all local agents from interacting with OmniHub:

1. **OmniHub side**: Set `OMNILINK_ENABLED=false` in Supabase Edge Function environment
   - This returns 503 for all requests
   - No mutations will occur

2. **Local side**: Stop all agent processes
   ```bash
   pkill -f lead_gen_agent
   pkill -f apex_sales_agent
   ```

3. **Revoke API keys**: In OmniDash → Integrations, revoke the API keys
   - Agents will receive 401 Unauthorized

### Revert Local Changes

To remove local agents entirely:
```bash
rm -rf local-agents/
```

No changes to core OmniHub code are required (all integration is via configuration and new tables).

## Telemetry Event Types

### Lead-Gen Events

| Event Type       | Description                      | Data Fields                           |
|------------------|----------------------------------|---------------------------------------|
| `lead_ingested`  | New lead ingested                | lead_id, url, role, score             |
| `lead_qualified` | Lead passed qualification        | lead_id, url, role, score             |
| `queue_seeded`   | Queue populated with leads       | queue_size, qualified_leads           |

### APEX-Sales Events

| Event Type       | Description                      | Data Fields                           |
|------------------|----------------------------------|---------------------------------------|
| `call_attempted` | Outbound call attempted          | lead_id, phone                        |
| `call_connected` | Call connected successfully      | lead_id, phone                        |
| `call_completed` | Call completed (any outcome)     | lead_id, outcome                      |
| `meeting_booked` | Meeting successfully booked      | lead_id, phone, meeting_time          |
| `error`          | Error occurred                   | lead_id, reason, error_type           |

## Idempotency

All telemetry emissions are idempotent via `idempotency_key`:
- Server enforces `UNIQUE(integration_id, idempotency_key)`
- Duplicate events return `200 OK` with `{status: 'duplicate'}`
- Safe to retry on network failures

## Constraints

- **Single Front Door**: Local agents ONLY communicate via OmniLink Port endpoints
- **No Direct DB Access**: Local agents never connect directly to Supabase Postgres
- **Tenant Identity**: Derived from OmniLink API key (not from request body)
- **Bounded Output**: Task completions truncated to 16KB max
- **Atomic Claims**: Task claims are concurrency-safe via `FOR UPDATE SKIP LOCKED`

## Troubleshooting

**401 Unauthorized**:
- Check `OMNIHUB_API_KEY` format (`omni.xxxxx.yyyyy`)
- Verify API key is not revoked in OmniDash
- Ensure integration is active

**403 Forbidden (permission_denied)**:
- Check API key scopes include required permissions
- Verify `OMNIHUB_SOURCE` matches integration configuration

**503 Service Unavailable (omnilink_disabled)**:
- OmniLink Port is disabled
- Check `OMNILINK_ENABLED=true` in Edge Function environment

**No tasks claimed**:
- Verify `OMNIHUB_SOURCE` and task `target` match
- Check task status is `queued` or `approved` (not `waiting_approval`)
- Ensure `run_at` is NULL or in the past

**Rate limited (429)**:
- Respect `retry_after_seconds` in response
- Reduce emission frequency
- Check API key `max_rpm` constraint
