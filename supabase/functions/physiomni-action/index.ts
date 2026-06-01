import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { buildCorsHeaders, handlePreflight } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabaseClient.ts';
import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts';

const PhysiOmniActionSchema = z.object({
  device_id: z.string().min(1),
  tenant_id: z.string().uuid(),
  action: z.enum(['MAN_MODE_TRIGGER', 'EMERGENCY_STOP', 'CALIBRATE', 'RESTART']),
  approved_by: z.string().nullable().optional(),
  bypass_policy: z.string().nullable().optional(),
});

function jsonResponse(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  const match = authHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function isServerApprovedBypassPolicy(bypassPolicy: string | null | undefined): boolean {
  const expectedPolicy = Deno.env.get('PHYSIOMNI_ACTION_BYPASS_POLICY');
  // Client-provided bypasses are denied unless deployment config pins one exact policy value.
  return Boolean(expectedPolicy && bypassPolicy && bypassPolicy === expectedPolicy);
}

async function hasApprovedManTask(
  supabase: ReturnType<typeof createServiceClient>,
  approvedBy: string | null | undefined,
  tenantId: string,
  deviceId: string,
  action: string,
): Promise<boolean> {
  if (!approvedBy) {
    return false;
  }

  const { data, error } = await supabase
    .from('man_tasks')
    .select('id')
    .eq('status', 'APPROVED')
    .eq('decided_by', approvedBy)
    .contains('intent', {
      tool_name: 'physiomni-action',
      params: { tenant_id: tenantId, device_id: deviceId, action },
    })
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .limit(1);

  if (error) {
    console.error('[physiomni-action] MAN approval lookup failed:', error.message);
    return false;
  }

  return Array.isArray(data) && data.length > 0;
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req.headers.get('Origin') ?? '');
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  try {
    const isPhysicalEnabled = Deno.env.get('PHYSIOMNI_PHYSICAL_ACTIONS_ENABLED') === 'true';
    if (!isPhysicalEnabled) {
      return jsonResponse({ error: 'Physical actions are disabled globally' }, 403, corsHeaders);
    }

    const token = extractBearerToken(req);
    if (!token) {
      return jsonResponse({ error: 'Authentication required' }, 401, corsHeaders);
    }

    const payload = await req.json();
    const parsed = PhysiOmniActionSchema.safeParse(payload);

    if (!parsed.success) {
      return jsonResponse({ error: 'Invalid action schema', details: parsed.error }, 400, corsHeaders);
    }

    const { device_id, tenant_id, action, approved_by, bypass_policy } = parsed.data;
    const supabase = createServiceClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const actorId = authData.user?.id;

    if (authError || !actorId) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401, corsHeaders);
    }

    // PhysiOmni tenant_id is auth.users.id; never trust body tenant claims that differ from JWT subject.
    if (actorId !== tenant_id) {
      return jsonResponse({ error: 'Operation rejected: tenant mismatch' }, 403, corsHeaders);
    }

    // Check kill switch
    // Note: Assuming Deno.env checks for global kill switch.
    const isKillSwitchActive = Deno.env.get('PHYSIOMNI_KILL_SWITCH_ACTIVE') === 'true';
    if (isKillSwitchActive) {
      return jsonResponse({ error: 'Operation rejected: Kill switch is active' }, 403, corsHeaders);
    }

    const { data: deviceData, error: deviceError } = await supabase
      .from('physiomni_devices')
      .select('id')
      .eq('device_serial', device_id)
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)
      .single();

    if (deviceError || !deviceData) {
      return jsonResponse({ error: 'Device not authorized for this tenant' }, 403, corsHeaders);
    }

    const hasApproval = await hasApprovedManTask(supabase, approved_by, tenant_id, device_id, action);
    const hasTrustedBypass = isServerApprovedBypassPolicy(bypass_policy);

    // Require server-verifiable MAN approval or a deployment-pinned bypass policy.
    if (!hasApproval && !hasTrustedBypass) {
      return jsonResponse({ error: 'Operation rejected: Action requires verified MAN approval or trusted bypass policy' }, 403, corsHeaders);
    }

    // Log the physical action attempt to audit table (must fail-closed if audit fails)
    const { error: auditError } = await supabase.from('omnihub_audit_log').insert({
      action: 'PHYSIOMNI_ACTION',
      tenant_id: tenant_id,
      actor_id: actorId,
      target_id: device_id,
      details: {
        command: action,
        approved_by: hasApproval ? approved_by : null,
        bypass_policy: hasTrustedBypass ? 'PHYSIOMNI_ACTION_BYPASS_POLICY' : null,
        status: 'DISPATCHED'
      }
    });

    if (auditError) {
      return jsonResponse({ error: 'Failed to record audit log. Dispatch aborted for safety.', details: auditError }, 500, corsHeaders);
    }

    // Dispatch command to device via persistent command queue + Realtime broadcast
    const { data: commandRecord, error: cmdError } = await supabase
      .from('physiomni_device_commands')
      .insert({
        device_id,
        tenant_id,
        command: action,
        status: 'QUEUED',
        approved_by: hasApproval ? approved_by : null,
        bypass_policy: hasTrustedBypass ? 'PHYSIOMNI_ACTION_BYPASS_POLICY' : null,
        metadata: { dispatched_via: 'physiomni-action', audit_logged: true, actor_id: actorId },
      })
      .select('id')
      .single();

    if (cmdError || !commandRecord) {
      console.error('[physiomni-action] Command queue insert failed:', cmdError?.message);
      return jsonResponse({ error: 'Failed to queue device command' }, 500, corsHeaders);
    }

    // Broadcast to Realtime channel — device subscribes to physiomni:device:{device_id}
    await supabase.channel(`physiomni:device:${device_id}`).send({
      type: 'broadcast',
      event: 'device_command',
      payload: {
        command_id: commandRecord.id,
        command: action,
        approved_by: hasApproval ? approved_by : null,
        timestamp: new Date().toISOString(),
      },
    });

    return jsonResponse({ success: true, message: 'Action dispatched successfully' }, 200, corsHeaders);
  } catch (err: unknown) {
    return jsonResponse({ error: 'Internal Server Error', message: (err as Error).message }, 500, corsHeaders);
  }
});
