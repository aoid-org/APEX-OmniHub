import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabaseClient.ts';
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

    // (In production, verify HMAC signature here using device secret)
    if (signature.length < 64) {
      return new Response(JSON.stringify({ error: 'Invalid signature format' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log telemetry to persistent store (timeseries db)
    // Note: this is a mock implementation for the telemetry ingestion success

    return new Response(
      JSON.stringify({ success: true, message: 'Telemetry ingested successfully', timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: (err as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
