# PhysiOmni Sensing Edge Layer: Operator Runbook
**Version:** 1.0.0 | **Date:** 2026-05-26 | **Author:** Lead AI Co-Founder | **Status:** Active & Grounded

**Target Surface:** Nordic nRF9161-DK + ADXL345 accelerometer pilot running mTLS HTTPS ingress to Supabase.

---

## 1. System Architecture Overview

```
Nordic nRF9161-DK --[mTLS HTTPS POST]--> physiomni-ingress (Deno Edge Function)
                                             |
             +-------------------------------+------------------------------+
             |                                                              |
   Insert Telemetry (deduped)                                     Evaluate Thresholds
             |                                                              |
             v                                                              v
   physiomni_telemetry                                           vibration_x > 15.0g?
   (monthly partitioned)                                                    |
                                                               +------------+------------+
                                                               |                         |
                                                            [Yes]                       [No]
                                                               |                         |
                                                    Insert Critical Alert        Warning Alert
                                                    -> Trigger MAN_MODE       (vibration > 10.0g)
                                                    -> Realtime Push
```

---

## 2. Ingress API Endpoint Reference

- **Staging URL:** `https://rtopreovkywofgwgmozi.supabase.co/functions/v1/physiomni-ingress`
- **Method:** `POST`
- **Authentication:** Transport-layer mTLS. Custom clients must present verified certificates matched at the Cloudflare/OmniPort edge.
- **Content-Type:** `application/json`

### JSON Request Payload Schema (Strict Union)

```json
{
  "device_serial": "nRF9161-TEST-001",
  "tenant_id": "e28bbd91-4cf6-4444-8d4e-120a1337beef",
  "vibration_x": 3.4,
  "vibration_y": 1.2,
  "vibration_z": 0.8,
  "temperature_c": 28.5,
  "timestamp": "2026-05-26T12:00:00Z"
}
```

---

## 3. Testing & Verification Runbook

### Case A: Local Emulation (Supabase Local Stack)
To test telemetry processing locally:

1. Send a standard vibration payload:
   ```bash
   curl -X POST http://localhost:54321/functions/v1/physiomni-ingress \
     -H "Content-Type: application/json" \
     -d '{"device_serial":"nRF9161-TEST-LOCAL","tenant_id":"e28bbd91-4cf6-4444-8d4e-120a1337beef","vibration_x":3.2,"vibration_y":1.8,"vibration_z":0.9,"temperature_c":42.1,"timestamp":"2026-05-26T12:00:00.000Z"}'
   ```
   **Expected Response:** `201 Created` with `{"status":"success","message":"Telemetry recorded"}`.

2. Send a threshold breach payload (`vibration_x > 15.0g`):
   ```bash
   curl -X POST http://localhost:54321/functions/v1/physiomni-ingress \
     -H "Content-Type: application/json" \
     -d '{"device_serial":"nRF9161-TEST-LOCAL","tenant_id":"e28bbd91-4cf6-4444-8d4e-120a1337beef","vibration_x":16.5,"vibration_y":4.1,"vibration_z":2.3,"temperature_c":45.0,"timestamp":"2026-05-26T12:01:00.000Z"}'
   ```
   **Expected Response:** `201 Created` with `{"status":"success","message":"Telemetry recorded","alert":{"severity":"critical","type":"vibration_breach","message":"Critical vibration threshold exceeded: 16.5g on X-axis"}}`.

---

## 4. Troubleshooting & Escalation Matrix

| Symptom | Probable Cause | Action |
|---|---|---|
| `400 Bad Request` | Missing or malformed parameters, invalid UUID, or non-finite vibration values. | Check payload structure. Ensure `tenant_id` is a valid UUID v4 and all values compile with strictly finite floats. |
| `409 Conflict` | Deduplication trigger. The hardware retry mechanism resent a payload with an identical `(device_serial, timestamp)`. | Safe to ignore. The function resolves duplicate records gracefully and returns success without executing duplicate DB inserts. |
| `500 Internal Server Error` | Database connection pool limits or RLS policy rejection. | Verify if the project has direct pooler connections. Check `physiomni-ingress` edge logs in the Supabase console. |

---

## 5. Staging Staged Deployment Verification

To manually deploy updates to the `physiomni-ingress` edge function:
```bash
$env:SUPABASE_ACCESS_TOKEN="<SUPABASE_TOKEN_AOID>"
npx supabase functions deploy physiomni-ingress --project-ref rtopreovkywofgwgmozi
```
To monitor performance and ingress payloads, use the remote dashboard at:
`https://supabase.com/dashboard/project/rtopreovkywofgwgmozi/functions/physiomni-ingress/monitor`
