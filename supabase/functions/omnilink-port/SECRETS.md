# omnilink-port Edge Function — Required Secrets

## CRITICAL: ORCHESTRATOR_URL

This edge function proxies all OmniBoard FSM calls to the Python orchestrator.
If `ORCHESTRATOR_URL` is missing from Supabase Edge Function secrets, every
`omniboard-start` and `omniboard-next` call returns **503 Service Unavailable**
and OmniBoard is completely non-functional.

### Where to set it

Supabase Dashboard > Edge Functions > omnilink-port > Secrets

```
ORCHESTRATOR_URL=https://apex-orchestrator-api.onrender.com
```

Or via CLI:
```bash
supabase secrets set ORCHESTRATOR_URL=https://apex-orchestrator-api.onrender.com --project-ref <your-project-ref>
```

### How to verify it is set

```bash
# Should return 200 with {"state": "IDLE_LISTEN", ...}
curl -X POST https://<project>.supabase.co/functions/v1/omnilink-port/omniboard-start \
  -H 'Authorization: Bearer <anon-key>' \
  -H 'Content-Type: application/json' \
  -d '{"tenant_id": "test", "trace_id": "test-trace"}'
```

If it returns `{"error": "connect_unavailable"}` the secret is not set or the
Render orchestrator is not healthy. Check Render logs first, then re-deploy the
edge function after setting the secret.

### All required secrets for this function

| Secret | Source | Required |
|---|---|---|
| `ORCHESTRATOR_URL` | Render dashboard (your orchestrator URL) | YES - OmniBoard dead without it |
| `SUPABASE_URL` | Auto-injected by Supabase | Auto |
| `SUPABASE_ANON_KEY` | Auto-injected by Supabase | Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard > Settings > API | YES |
