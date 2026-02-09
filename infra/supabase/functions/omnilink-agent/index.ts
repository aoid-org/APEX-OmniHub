import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return handlePreflight(req);
  }

  const origin = req.headers.get('origin');

  try {
    const { user, supabase } = await validateAuth(req);
    const { query, traceId } = await req.json();

    await updateRunStatus(supabase, traceId, 'running');

    const orchestratorResponse = await callOrchestrator(user.id, query, traceId);

    if (orchestratorResponse.workflowId) {
      await updateRunStatus(supabase, traceId, undefined, orchestratorResponse.workflowId);
    }

    return new Response(JSON.stringify(orchestratorResponse), {
      headers: {
        ...buildCorsHeaders(origin),
        "Content-Type": "application/json",
      },
    });

  } catch (err: any) {
    console.error('Router error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: err.message === 'Unauthorized' || err.message === 'Missing Auth' ? 401 : 500,
      headers: {
        ...buildCorsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
  }
});

async function validateAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing Auth');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const { data: { user }, error } = await supabase.auth.getUser(authHeader);

  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return { user, supabase };
}

async function updateRunStatus(supabase: ReturnType<typeof createClient>, traceId: string, status?: string, workflowId?: string) {
  const updates: Record<string, unknown> = {};
  if (status) {
    updates.status = status;
    if (status === 'running') updates.start_time = new Date().toISOString();
  }
  if (workflowId) {
      updates.workflow_id = workflowId;
  }

  const { error } = await supabase
    .from('agent_runs')
    .update(updates)
    .eq('id', traceId);

  if (error) {
    console.error('Failed to update agent_run:', error);
  }
}

async function callOrchestrator(userId: string, query: string, traceId: string) {
  const orchestratorUrl = Deno.env.get('ORCHESTRATOR_URL');
    if (!orchestratorUrl) {
      throw new Error('System Misconfiguration: ORCHESTRATOR_URL missing');
    }

    const response = await fetch(`${orchestratorUrl}/api/v1/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        user_intent: query,
        trace_id: traceId
      })
    });

    return await response.json();
}
