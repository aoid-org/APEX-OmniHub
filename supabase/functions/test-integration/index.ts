import { z } from 'https://esm.sh/zod@3.25.76';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createSupabaseClient, authenticateUser } from '../_shared/auth.ts';
import { buildCorsHeaders, handleCors } from '../_shared/cors.ts';
import { assertUrlSafe } from '../_shared/ssrf-protection.ts';

type IntegrationType = 'slack' | 'zapier' | 'github' | 'notion' | 'google_drive';

type IntegrationConfig = {
  apiKey?: string;
  webhookUrl?: string;
};

type TestResult = {
  connected: boolean;
  message: string;
  details?: Record<string, string | null> | null;
};

const REQUEST_SCHEMA = z.object({
  integrationId: z.string().uuid(),
});

const INTEGRATION_SCHEMA = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: z.enum(['slack', 'zapier', 'github', 'notion', 'google_drive']),
  config: z.record(z.string(), z.unknown()),
});

const TEST_INTEGRATION_ENABLED = Deno.env.get('ENABLE_TEST_INTEGRATION') === 'true';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin);

  if (!TEST_INTEGRATION_ENABLED) {
    return jsonResponse({ error: 'not_found' }, 404, corsHeaders);
  }

  try {
    const supabase = createSupabaseClient();

    // Work Package C: Auth Gate (SD-02)
    const authHeader = req.headers.get('Authorization');
    const authResult = await authenticateUser(authHeader, supabase);
    if (!authResult.success) {
      return jsonResponse({ error: 'Unauthorized', message: authResult.error }, 401, corsHeaders);
    }

    const requestBody = REQUEST_SCHEMA.parse(await req.json());

    const { data: integration, error: fetchError } = await supabase
      .from('integrations')
      .select('id, user_id, type, config')
      .eq('id', requestBody.integrationId)
      .eq('user_id', authResult.user!.id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!integration) {
      return jsonResponse({ error: 'not_found' }, 404, corsHeaders);
    }

    const parsedIntegration = INTEGRATION_SCHEMA.parse(integration);
    const integrationType = parsedIntegration.type as IntegrationType;
    const integrationConfig = parsedIntegration.config as IntegrationConfig;

    const testResult = await runIntegrationTest(integrationType, integrationConfig);

    await supabase
      .from('integrations')
      .update({
        status: testResult.connected ? 'active' : 'error',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestBody.integrationId)
      .eq('user_id', authResult.user!.id);

    return jsonResponse(testResult, 200, corsHeaders);
  } catch (error) {
    console.error('Integration test error:', error);
    return jsonResponse(
      { connected: false, error: error instanceof Error ? error.message : 'Unknown error' },
      500,
      corsHeaders,
    );
  }
});

async function runIntegrationTest(
  integrationType: IntegrationType,
  integrationConfig: IntegrationConfig,
): Promise<TestResult> {
  switch (integrationType) {
    case 'slack':
      return await testSlack(integrationConfig);
    case 'zapier':
      return await testZapier(integrationConfig);
    case 'github':
      return await testGitHub(integrationConfig);
    case 'notion':
      return await testNotion(integrationConfig);
    case 'google_drive':
      return await testGoogleDrive(integrationConfig);
    default:
      return { connected: false, message: 'Integration type not supported' };
  }
}

async function testSlack(config: IntegrationConfig): Promise<TestResult> {
  const validationError = validateConfigKey(config, 'apiKey', 'API key missing');
  if (validationError) return validationError;

  return await testApiConnection(
    {
      url: 'https://slack.com/api/auth.test',
      headers: buildBearerAuth(config.apiKey),
    },
    (data: { ok: boolean; team?: string; user?: string; error?: string }) => ({
      connected: data.ok,
      message: data.ok ? `Connected to ${data.team}` : data.error ?? 'Unknown error',
      details: data.ok ? { team: data.team ?? null, user: data.user ?? null } : null,
    }),
  );
}

async function testZapier(config: IntegrationConfig): Promise<TestResult> {
  const validationError = validateConfigKey(config, 'webhookUrl', 'Webhook URL missing');
  if (validationError) return validationError;

  const webhookUrl = config.webhookUrl as string;
  await assertUrlSafe(webhookUrl, { resolveDns: true });

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
  });

  return {
    connected: response.ok,
    message: response.ok ? 'Webhook test successful' : 'Webhook test failed',
  };
}

async function testGitHub(config: IntegrationConfig): Promise<TestResult> {
  const validationError = validateConfigKey(config, 'apiKey', 'API token missing');
  if (validationError) return validationError;

  return await testApiConnection(
    {
      url: 'https://api.github.com/user',
      headers: buildTokenAuth(config.apiKey),
    },
    (data: { login?: string; name?: string }, response) => ({
      connected: response.ok,
      message: response.ok ? `Connected as ${data.login}` : 'Authentication failed',
      details: response.ok ? { username: data.login ?? null, name: data.name ?? null } : null,
    }),
  );
}

async function testNotion(config: IntegrationConfig): Promise<TestResult> {
  const validationError = validateConfigKey(config, 'apiKey', 'API key missing');
  if (validationError) return validationError;

  return await testApiConnection(
    {
      url: 'https://api.notion.com/v1/users/me',
      headers: {
        ...buildBearerAuth(config.apiKey),
        'Notion-Version': '2022-06-28',
      },
    },
    (data: { type?: string }, response) => ({
      connected: response.ok,
      message: response.ok ? 'Connected to Notion' : 'Authentication failed',
      details: response.ok ? { type: data.type ?? null } : null,
    }),
  );
}

async function testGoogleDrive(config: IntegrationConfig): Promise<TestResult> {
  const validationError = validateConfigKey(config, 'apiKey', 'API key missing');
  if (validationError) return validationError;

  return await testApiConnection(
    {
      url: 'https://www.googleapis.com/drive/v3/about?fields=user',
      headers: buildBearerAuth(config.apiKey),
    },
    (data: { user?: { emailAddress?: string } }, response) => ({
      connected: response.ok,
      message: response.ok ? `Connected as ${data.user?.emailAddress}` : 'Authentication failed',
      details: response.ok ? { email: data.user?.emailAddress ?? null } : null,
    }),
  );
}

function validateConfigKey(
  config: IntegrationConfig,
  key: keyof IntegrationConfig,
  message: string,
): TestResult | null {
  if (!config[key]) {
    return { connected: false, message };
  }
  return null;
}

function buildBearerAuth(token: string | undefined): Record<string, string> {
  return { Authorization: `Bearer ${token ?? ''}` };
}

function buildTokenAuth(token: string | undefined): Record<string, string> {
  return { Authorization: `token ${token ?? ''}` };
}

async function testApiConnection<T>(
  request: { url: string; headers: Record<string, string> },
  transform: (data: T, response: Response) => TestResult,
): Promise<TestResult> {
  const response = await fetch(request.url, { headers: request.headers });
  const data = (await response.json()) as T;
  return transform(data, response);
}

function jsonResponse(data: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
