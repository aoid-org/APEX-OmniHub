<!-- APEX_DOC_STAMP: VERSION=v1.4.2 | LAST_UPDATED=2026-03-15 -->
# Status Page Setup

## Provider: Betteruptime (recommended) or Statuspage.io

### Quick Setup (Betteruptime — 15 minutes)

1. Create account at https://betteruptime.com
2. Add monitors:
   - `https://apexomnihub.icu` — HTTP 200 check, 1-min interval
   - `https://apexomnihub.icu/health` — JSON health endpoint
   - `https://wwajmaohwcbooljdureo.supabase.co/rest/v1/` — Supabase API
3. Create public status page at `status.apexomnihub.icu`
4. Add CNAME DNS record: `status.apexomnihub.icu → betteruptime CNAME`
5. Add `BETTERUPTIME_API_KEY` to GitHub Secrets

### Health Endpoint (implement in Vercel Edge Function)

Create `supabase/functions/health/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async () => {
  return new Response(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.4.2',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Incident Response
- SEV1 (full outage): Page on-call within 5 min
- SEV2 (degraded): Slack alert + status page update within 15 min
- SEV3 (minor): Status page update only

See: docs/ops/INCIDENT_RESPONSE.md
