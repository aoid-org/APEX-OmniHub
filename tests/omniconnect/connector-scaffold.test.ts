import { describe, expect, it } from 'vitest';
import { scaffoldConnector, persistScaffoldTelemetry } from '../../src/omniconnect/scaffold';

describe('connector scaffold', () => {
  it.each(['api_key', 'oauth2', 'webhook'] as const)('creates %s scaffolds as beta only', async (authType) => {
    const output = await scaffoldConnector({
      name: `Example ${authType}`,
      authType,
      urls: ['https://api.example.com'],
      testEndpoint: 'https://api.example.com/health',
    });

    expect(output.integration.status).toBe('beta');
    expect(output.config.status).toBe('beta');
    expect(output.rawEventsOnly).toBe(true);
    expect(output.promotionRequired).toBe(true);
  });

  it('blocks private/internal URL scaffolds before a request can fire', async () => {
    await expect(scaffoldConnector({
      name: 'Metadata Theft',
      authType: 'webhook',
      urls: ['https://169.254.169.254/latest/meta-data'],
    })).rejects.toThrow(/SSRF blocked IP|blocked/);
  });

  it('refuses to persist any scaffold promoted to ga', async () => {
    const output = await scaffoldConnector({ name: 'Safe API', authType: 'api_key', urls: ['https://api.example.com'] });
    output.integration.status = 'ga';
    await expect(persistScaffoldTelemetry(output, async () => undefined)).rejects.toThrow(/must remain beta/);
  });
});
