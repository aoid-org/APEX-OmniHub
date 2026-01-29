import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { buildCorsHeaders, handlePreflight, isOriginAllowed, corsErrorResponse } from "../_shared/cors.ts";
import { checkRateLimit, rateLimitExceededResponse, RATE_LIMIT_CONFIGS } from "../_shared/rate-limit.ts";

function generateRequestId(): string {
  return `hc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function checkOrchestratorConnection(requestId: string, orchestratorUrl?: string): Promise<{ status: 'healthy' | 'degraded' | 'unconfigured'; warning?: string }> {
  if (!orchestratorUrl) {
    console.warn('⚠️ ORCHESTRATOR_URL not configured - skipping orchestrator health check');
    return { status: 'unconfigured', warning: 'ORCHESTRATOR_URL environment variable not set' };
  }

  try {
    const orchestratorResponse = await fetch(`${orchestratorUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!orchestratorResponse.ok) {
      throw new Error(`Orchestrator returned ${orchestratorResponse.status}`);
    }

    const orchestratorHealth = await orchestratorResponse.json();
    if (orchestratorHealth.status !== 'ok') {
      throw new Error('Orchestrator health check failed');
    }
    console.log(`[${requestId}] ✅ Orchestrator health check passed`);
    return { status: 'healthy' };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown orchestrator error';
    console.warn(`[${requestId}] ⚠️ Orchestrator health check failed (non-blocking): ${errorMsg}`);
    return { status: 'degraded', warning: errorMsg };
  }
}

Deno.serve(async (req: Request) => {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const requestOrigin = req.headers.get('origin')?.replace(/\/$/, '') ?? null;
  const corsHeaders = buildCorsHeaders(requestOrigin);

  console.log(`[${requestId}] Health check started`);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handlePreflight(req);
  }

  if (!isOriginAllowed(requestOrigin)) {
    return corsErrorResponse('origin_not_allowed', 'CORS policy: Origin not allowed', 403, requestOrigin);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');

    // Get user for rate limiting
    const tempClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });
    const { data: authData } = await tempClient.auth.getUser();
    const userId = authData?.user?.id;

    // Rate limiting check
    const rateCheck = await checkRateLimit(userId ?? 'anonymous', RATE_LIMIT_CONFIGS.healthcheck);
    if (!rateCheck.allowed) {
      console.warn(`[${requestId}] Rate limit exceeded for user ${userId ?? 'anonymous'}`);
      return rateLimitExceededResponse(requestOrigin, rateCheck);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Test 1: Database health - lightweight query to emergency_controls table
    const { error: dbError } = await supabase
      .from('emergency_controls')
      .select('id')
      .limit(1);

    if (dbError) {
      console.error('❌ Database health check failed:', dbError);
      return new Response(
        JSON.stringify({
          status: 'error',
          component: 'database',
          error: dbError.message
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test 2: Orchestrator health - check Python service endpoint (NON-BLOCKING)
    const { status: orchestratorStatus, warning: orchestratorWarning } = await checkOrchestratorConnection(requestId, Deno.env.get('ORCHESTRATOR_URL'));

    // Database test passed, orchestrator is non-blocking - Add security headers
    const duration = Date.now() - startTime;
    const overallStatus = orchestratorStatus === 'healthy' ? 'OK' : 'OK_WITH_WARNINGS';
    console.log(`[${requestId}] ✅ Health check passed (${duration}ms) - Status: ${overallStatus}`);

    const securityHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Request-ID': requestId
    };

    const responseBody: Record<string, unknown> = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      components: {
        database: 'healthy',
        orchestrator: orchestratorStatus,
        auth: 'passed'
      },
      requestId
    };

    if (orchestratorWarning) {
      responseBody.warnings = [`orchestrator: ${orchestratorWarning}`];
    }

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: securityHeaders }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] ❌ Health check failed (${duration}ms):`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        status: 'error',
        error: errorMessage,
        requestId
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      }
    );
  }
});
