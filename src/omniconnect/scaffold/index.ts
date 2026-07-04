import { Globe } from 'lucide-react';
import type { IntegrationDef } from '../core/registry';
import type { ConnectorConfig, RawEvent } from '../types/connector';
import { validateWebhookUrl } from '../../lib/ssrf-validation';

export type ScaffoldAuthType = 'api_key' | 'oauth2' | 'webhook';

export interface ConnectorScaffoldInput {
  name: string;
  authType: ScaffoldAuthType;
  urls: string[];
  testEndpoint?: string;
  scopes?: string[];
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export interface ConnectorScaffoldOutput {
  integration: IntegrationDef;
  config: ConnectorConfig;
  rawEventsOnly: true;
  initialEvents: RawEvent[];
  promotionRequired: true;
}

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function assertAuthType(authType: string): asserts authType is ScaffoldAuthType {
  if (!['api_key', 'oauth2', 'webhook'].includes(authType)) {
    throw new Error('Choose API key, OAuth2, or webhook authentication.');
  }
}

export async function validateScaffoldUrls(input: ConnectorScaffoldInput): Promise<URL[]> {
  const urls = [...input.urls, ...(input.testEndpoint ? [input.testEndpoint] : [])].filter(Boolean);
  if (urls.length === 0) throw new Error('Add at least one public HTTPS URL for this connector.');

  const parsedUrls = urls.map((url) => new URL(url));
  const allowlistHosts = Array.from(new Set(parsedUrls.map((url) => url.hostname)));
  for (const url of urls) {
    await validateWebhookUrl(url, { allowlistHosts });
  }
  return parsedUrls;
}

export async function scaffoldConnector(input: ConnectorScaffoldInput): Promise<ConnectorScaffoldOutput> {
  const name = input.name.trim();
  if (!name) throw new Error('Connector name is required.');
  assertAuthType(input.authType);
  const urls = await validateScaffoldUrls(input);
  const id = `custom-${slugify(name)}`;
  const baseUrl = urls[0].origin;

  const config: ConnectorConfig = {
    provider: id,
    clientId: input.clientId ?? '',
    clientSecret: input.clientSecret,
    redirectUri: input.redirectUri ?? '',
    scopes: input.scopes ?? [],
    baseUrl,
    category: 'operations',
    version: '0.1',
    status: 'beta',
    health: {},
  };

  return {
    integration: {
      id,
      name,
      type: id,
      description: `${name} custom ${input.authType.replace('_', '-')} connector scaffold`,
      icon: Globe,
      requiresApiKey: input.authType === 'api_key',
      scopes: config.scopes,
      category: 'operations',
      version: '0.1',
      status: 'beta',
      health: {},
      docsUrl: baseUrl,
    },
    config,
    rawEventsOnly: true,
    initialEvents: [],
    promotionRequired: true,
  };
}

export async function persistScaffoldTelemetry(
  output: ConnectorScaffoldOutput,
  persist: (row: Record<string, unknown>) => Promise<void>,
): Promise<void> {
  if (output.integration.status !== 'beta' || output.config.status !== 'beta') {
    throw new Error('Custom connector scaffolds must remain beta until human promotion.');
  }
  await persist({
    provider: output.integration.type,
    name: output.integration.name,
    status: 'beta',
    source: 'omniboard_custom_scaffold',
    raw_events_only: true,
    promotion_required: true,
  });
}
