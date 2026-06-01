import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCorsHeaders, handlePreflight, corsErrorResponse } from "../_shared/cors.ts";

interface RequestBody {
  tier: 'BASIC';
  skills: Record<string, unknown>[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsErrorResponse('UNAUTHORIZED', 'Missing authorization header', 401, origin);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('Missing Supabase environment configuration for activate-client');
      return corsErrorResponse('SERVER_CONFIGURATION_ERROR', 'Activation service is not configured', 500, origin);
    }

    const client = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      return corsErrorResponse('UNAUTHORIZED', 'Invalid authentication token', 401, origin);
    }

    const body = await req.json() as RequestBody;

    if (body.tier !== 'BASIC') {
      return new Response(
        JSON.stringify({ error: 'INVALID_TIER', message: 'Only BASIC tier can be activated via this endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // The RPC is service-role only; bind activation to the validated JWT user here.
    const { data, error } = await adminClient.rpc('activate_client_subscription', {
      p_user_id: user.id,
      p_tier: 'BASIC',
      p_skills: body.skills
    });

    if (error) {
      console.error('Failed to activate client:', error);
      return new Response(
        JSON.stringify({ error: 'DATABASE_ERROR', message: 'Failed to activate client entitlements' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({
        error: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
