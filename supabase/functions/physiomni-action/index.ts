import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabaseClient.ts';
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from '../_shared/rate-limit.ts';
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts';

const PhysiOmniActionSchema = z.object({
  device_id: z.string().min(1),
  tenant_id: z.string().min(1),
  action: z.enum(['MAN_MODE_TRIGGER', 'EMERGENCY_STOP', 'CALIBRATE', 'RESTART']),
  approved_by: z.string().nullable().optional(), 
  bypass_policy: z.string().nullable().optional(), 
});

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin') ?? '');
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  try {
    const isPhysicalEnabled = Deno.env.get('PHYSIOMNI_PHYSICAL_ACTIONS_ENABLED') === 'true';
    if (!isPhysicalEnabled) {
      return new Response(JSON.stringify({ error: 'Physical actions are disabled globally' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json();
    const parsed = PhysiOmniActionSchema.safeParse(payload);

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid action schema', details: parsed.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { device_id, tenant_id, action, approved_by, bypass_policy } = parsed.data;

    // Distributed rate limiting — no authenticated user on this endpoint; key by tenant
    const rl = await checkRateLimit(tenant_id, RATE_LIMIT_CONFIGS.physiomniAction);
    if (!rl.allowed) {
      return rateLimitExceededResponse(req.headers.get('Origin') ?? '', rl);
    }

    // Check kill switch
    // Note: Assuming Deno.env checks for global kill switch.
    const isKillSwitchActive = Deno.env.get('PHYSIOMNI_KILL_SWITCH_ACTIVE') === 'true';
    if (isKillSwitchActive) {
      return new Response(JSON.stringify({ error: 'Operation rejected: Kill switch is active' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Require RSI approval or bypass policy
    if (!approved_by && !bypass_policy) {
      return new Response(JSON.stringify({ error: 'Operation rejected: Action requires RSI approval or an explicit bypass policy' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createServiceClient();
    
    // Log the physical action attempt to audit table (must fail-closed if audit fails)
    const { error: auditError } = await supabase.from('omnihub_audit_log').insert({
      action: 'PHYSIOMNI_ACTION',
      tenant_id: tenant_id,
      actor_id: 'system', // or the authenticated user dispatching
      target_id: device_id,
      details: {
        command: action,
        approved_by,
        bypass_policy,
        status: 'DISPATCHED'
      }
    });

    if (auditError) {
      return new Response(JSON.stringify({ error: 'Failed to record audit log. Dispatch aborted for safety.', details: auditError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Dispatch command to device via persistent command queue + Realtime broadcast
    const { data: commandRecord, error: cmdError } = await supabase
      .from('physiomni_device_commands')
      .insert({
        device_id,
        tenant_id,
        command: action,
        status: 'QUEUED',
        approved_by: approved_by ?? null,
        bypass_policy: bypass_policy ?? null,
        metadata: { dispatched_via: 'physiomni-action', audit_logged: true },
      })
      .select('id')
      .single();

    if (cmdError || !commandRecord) {
      console.error('[physiomni-action] Command queue insert failed:', cmdError?.message);
      return new Response(JSON.stringify({ error: 'Failed to queue device command' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Broadcast to Realtime channel — device subscribes to physiomni:device:{device_id}
    await supabase.channel(`physiomni:device:${device_id}`).send({
      type: 'broadcast',
      event: 'device_command',
      payload: {
        command_id: commandRecord.id,
        command: action,
        approved_by,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Action dispatched successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: (err as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
