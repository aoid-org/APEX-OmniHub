import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildCorsHeaders, handlePreflight, corsErrorResponse } from "../_shared/cors.ts";
import {
  checkRateLimit,
  rateLimitExceededResponse,
  RATE_LIMIT_CONFIGS,
} from "../_shared/rate-limit.ts";

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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const client = createClient(
      supabaseUrl,
      anonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await client.auth.getUser();

    if (authError || !user) {
      return corsErrorResponse('UNAUTHORIZED', 'Invalid authentication token', 401, origin);
    }

    const rl = await checkRateLimit(user.id, RATE_LIMIT_CONFIGS.activateClient);
    if (!rl.allowed) {
      return rateLimitExceededResponse(origin, rl);
    }

    const body = await req.json() as RequestBody;

    if (body.tier !== 'BASIC') {
      return new Response(
        JSON.stringify({ error: 'INVALID_TIER', message: 'Only BASIC tier can be activated via this endpoint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is required for activate-client');
      return new Response(
        JSON.stringify({ error: 'SERVER_MISCONFIGURED', message: 'Activation service is not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await adminClient.rpc('activate_client_subscription', {
      p_user_id: user.id,
      p_tier: 'BASIC',
      p_skills: Array.isArray(body.skills) ? body.skills : []
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
        message: 'Failed to process activation request',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
