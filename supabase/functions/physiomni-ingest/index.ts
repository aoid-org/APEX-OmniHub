import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabaseClient.ts';
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from '../_shared/rate-limit.ts';
// In a real env, this would be a shared import.
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts';

const PhysiOmniTelemetrySchema = z.object({
  device_id: z.string().min(1),
  tenant_id: z.string().min(1),
  timestamp: z.string().datetime(),
  nonce: z.string().min(16),
  signature: z.string().min(64),
  payload: z.object({
    vibration_x: z.number(),
    vibration_y: z.number(),
    vibration_z: z.number(),
    temp_c: z.number(),
  }),
});

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin') ?? '');
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  try {
    const isLiveEnabled = Deno.env.get('PHYSIOMNI_LIVE_ENABLED') === 'true';
    if (!isLiveEnabled) {
      return new Response(JSON.stringify({ error: 'PhysiOmni is not running in live mode' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const parsed = PhysiOmniTelemetrySchema.safeParse(payload);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid telemetry schema', details: parsed.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { device_id, tenant_id, timestamp, signature } = parsed.data;

    // Distributed rate limiting — no authenticated user on telemetry ingress; key by tenant
    const rl = await checkRateLimit(tenant_id, RATE_LIMIT_CONFIGS.physiomniIngest);
    if (!rl.allowed) {
      return rateLimitExceededResponse(req.headers.get('Origin') ?? '', rl);
    }

    // Reject stale telemetry (older than 30s)
    const telemetryTime = new Date(timestamp).getTime();
    if (Date.now() - telemetryTime > 30000) {
      return new Response(JSON.stringify({ error: 'Telemetry payload too old (replay defense)' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServiceClient();
    
    // Check if device is bound to this tenant and get secret for signature verify
    const { data: deviceData, error: deviceError } = await supabase
      .from('omnilink_api_keys') // Or dedicated devices table
      .select('id, tenant_id')
      .eq('integration_id', device_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (deviceError || !deviceData) {
       return new Response(JSON.stringify({ error: 'Device not authorized for this tenant' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify HMAC-SHA256 signature using device's shared secret
    const hmacSecret = Deno.env.get('PHYSIOMNI_DEVICE_HMAC_SECRET');
    if (hmacSecret) {
      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(hmacSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const message = `${device_id}:${tenant_id}:${timestamp}:${parsed.data.nonce}`;
      let sigBytes: Uint8Array;
      try {
        sigBytes = Uint8Array.from(
          signature.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
        );
      } catch {
        return new Response(JSON.stringify({ error: 'Malformed signature encoding' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const valid = await crypto.subtle.verify('HMAC', keyMaterial, sigBytes, encoder.encode(message));
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Signature verification failed' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Persist telemetry — idempotent via UNIQUE(device_serial, captured_at)
    const { error: insertError } = await supabase
      .from('physiomni_telemetry')
      .upsert(
        {
          tenant_id,
          device_serial: device_id,
          vibration_x: parsed.data.payload.vibration_x,
          vibration_y: parsed.data.payload.vibration_y,
          vibration_z: parsed.data.payload.vibration_z,
          temperature_c: parsed.data.payload.temp_c,
          captured_at: timestamp,
          metadata: { nonce: parsed.data.nonce, source: 'physiomni-ingest' },
        },
        { onConflict: 'device_serial,captured_at', ignoreDuplicates: true },
      );

    if (insertError) {
      console.error('[physiomni-ingest] DB insert error:', insertError.message);
      return new Response(JSON.stringify({ error: 'Telemetry persistence failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update device last_seen_at
    await supabase
      .from('physiomni_devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('device_serial', device_id)
      .eq('tenant_id', tenant_id);

    return new Response(
      JSON.stringify({ success: true, message: 'Telemetry ingested successfully', timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: (err as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
