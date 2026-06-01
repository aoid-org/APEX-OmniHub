import { z } from 'https://deno.land/x/zod@v3.21.4/mod.ts';
import { createSupabaseClient } from '../_shared/auth.ts';
import { withHttp, jsonResponse } from '../_shared/http.ts';

const PhysiOmniActionSchema = z.object({
  device_id: z.string().min(1),
  tenant_id: z.string().uuid(),
  action: z.enum(['MAN_MODE_TRIGGER', 'EMERGENCY_STOP', 'CALIBRATE', 'RESTART']),
  approved_by: z.string().min(1).nullable().optional(),
  bypass_policy: z.string().min(1).nullable().optional(),
});

type PhysiOmniAction = z.infer<typeof PhysiOmniActionSchema>;
type SupabaseClient = ReturnType<typeof createSupabaseClient>;

const AUTHORIZED_ROLES = new Set(['admin', 'super_admin', 'operator']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface UserRoleRow {
  role: string;
}

interface ApprovalRow {
  command_id: string;
  approved_by: string | null;
  payload: Record<string, unknown> | null;
  target_entity_id: string | null;
}

function jsonError(error: string, status: number, headers: HeadersInit, detail?: unknown): Response {
  return jsonResponse(detail === undefined ? { error } : { error, detail }, status, headers);
}

async function getUserRoles(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId);
  if (error || !data) return [];
  return (data as UserRoleRow[]).map((row) => row.role);
}

async function verifyTenantDevice(supabase: SupabaseClient, input: PhysiOmniAction): Promise<boolean> {
  const idColumn = UUID_RE.test(input.device_id) ? 'id' : 'device_serial';
  const { data, error } = await supabase
    .from('physiomni_devices')
    .select('id')
    .eq('tenant_id', input.tenant_id)
    .eq(idColumn, input.device_id)
    .eq('is_active', true)
    .limit(1);

  return !error && Array.isArray(data) && data.length === 1;
}

function approvalMatchesAction(approval: ApprovalRow, input: PhysiOmniAction): boolean {
  const payload = approval.payload ?? {};
  const payloadDeviceId = payload['device_id'];
  const payloadTenantId = payload['tenant_id'];
  const payloadAction = payload['action'];

  // Bind the approval to this exact physical action; generic approvals fail closed.
  return (
    approval.approved_by !== null &&
    (approval.target_entity_id === null || approval.target_entity_id === input.device_id) &&
    payloadDeviceId === input.device_id &&
    payloadTenantId === input.tenant_id &&
    payloadAction === input.action
  );
}

async function verifyServerApproval(supabase: SupabaseClient, input: PhysiOmniAction): Promise<ApprovalRow | null> {
  if (!input.approved_by) return null;

  const { data, error } = await supabase
    .from('omnibridge_control_audit')
    .select('command_id, approved_by, payload, target_entity_id')
    .eq('command_id', input.approved_by)
    .eq('state', 'approved')
    .limit(1);

  if (error || !Array.isArray(data) || data.length !== 1) return null;

  const approval = data[0] as ApprovalRow;
  return approvalMatchesAction(approval, input) ? approval : null;
}

export default Deno.serve(withHttp(async (_req, ctx) => {
  if (_req.method !== 'POST') {
    return jsonError('method_not_allowed', 405, ctx.corsHeaders);
  }

  const isPhysicalEnabled = Deno.env.get('PHYSIOMNI_PHYSICAL_ACTIONS_ENABLED') === 'true';
  if (!isPhysicalEnabled) {
    return jsonError('Physical actions are disabled globally', 403, ctx.corsHeaders);
  }

  const isKillSwitchActive = Deno.env.get('PHYSIOMNI_KILL_SWITCH_ACTIVE') === 'true';
  if (isKillSwitchActive) {
    return jsonError('Operation rejected: Kill switch is active', 403, ctx.corsHeaders);
  }

  const parsed = PhysiOmniActionSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return jsonError('Invalid action schema', 400, ctx.corsHeaders, parsed.error);
  }

  const input = parsed.data;
  const userId = ctx.user!.id;
  if (input.tenant_id !== userId) {
    return jsonError('Operation rejected: tenant does not match authenticated user', 403, ctx.corsHeaders);
  }

  const supabase = createSupabaseClient();
  const roles = await getUserRoles(supabase, userId);
  if (!roles.some((role) => AUTHORIZED_ROLES.has(role))) {
    return jsonError('Operation rejected: insufficient role for physical action', 403, ctx.corsHeaders);
  }

  const deviceVerified = await verifyTenantDevice(supabase, input);
  if (!deviceVerified) {
    return jsonError('Operation rejected: device is not active for authenticated tenant', 403, ctx.corsHeaders);
  }

  const approval = await verifyServerApproval(supabase, input);
  if (!approval) {
    return jsonError('Operation rejected: verified MAN/RSI approval is required', 403, ctx.corsHeaders);
  }

  // Client-supplied bypass_policy is retained only as context; it never authorizes dispatch.
  const { error: auditError } = await supabase.from('omnihub_audit_log').insert({
    action: 'PHYSIOMNI_ACTION',
    tenant_id: input.tenant_id,
    actor_id: userId,
    target_id: input.device_id,
    details: {
      command: input.action,
      approval_id: approval.command_id,
      approved_by: approval.approved_by,
      bypass_policy: input.bypass_policy ?? null,
      status: 'DISPATCHED',
    },
  });

  if (auditError) {
    return jsonError('Failed to record audit log. Dispatch aborted for safety.', 500, ctx.corsHeaders, auditError);
  }

  const { data: commandRecord, error: cmdError } = await supabase
    .from('physiomni_device_commands')
    .insert({
      device_id: input.device_id,
      tenant_id: input.tenant_id,
      command: input.action,
      status: 'QUEUED',
      approved_by: approval.approved_by,
      bypass_policy: input.bypass_policy ?? null,
      metadata: { dispatched_via: 'physiomni-action', audit_logged: true, approval_id: approval.command_id },
    })
    .select('id')
    .single();

  if (cmdError || !commandRecord) {
    console.error('[physiomni-action] Command queue insert failed:', cmdError?.message);
    return jsonError('Failed to queue device command', 500, ctx.corsHeaders);
  }

  await supabase.channel(`physiomni:device:${input.device_id}`).send({
    type: 'broadcast',
    event: 'device_command',
    payload: {
      command_id: commandRecord.id,
      command: input.action,
      approval_id: approval.command_id,
      approved_by: approval.approved_by,
      timestamp: new Date().toISOString(),
    },
  });

  return jsonResponse({ success: true, message: 'Action dispatched successfully' }, 200, ctx.corsHeaders);
}, { requireAuth: true, requireOrigin: false, maxBodySizeBytes: 64 * 1024 }));
