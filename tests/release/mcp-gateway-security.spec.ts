import { describe, expect, it } from 'vitest';

import { isMcpGatewayAuthorized } from '../../supabase/functions/mcp-gateway/auth';

describe('MCP gateway authorization', () => {
  it('fails closed when the server secret is absent', () => {
    const req = new Request('https://example.test/mcp-gateway', {
      headers: { Authorization: 'Bearer anything' },
    });
    expect(isMcpGatewayAuthorized(req, undefined)).toBe(false);
    expect(isMcpGatewayAuthorized(req, '   ')).toBe(false);
  });

  it('accepts the dedicated bearer or x-api-key header', () => {
    expect(isMcpGatewayAuthorized(new Request('https://example.test', {
      headers: { Authorization: 'Bearer release-secret' },
    }), 'release-secret')).toBe(true);
    expect(isMcpGatewayAuthorized(new Request('https://example.test', {
      headers: { 'x-api-key': 'release-secret' },
    }), 'release-secret')).toBe(true);
  });

  it('rejects URL query credentials and mismatched headers', () => {
    expect(isMcpGatewayAuthorized(
      new Request('https://example.test/mcp-gateway?key=release-secret'),
      'release-secret',
    )).toBe(false);
    expect(isMcpGatewayAuthorized(new Request('https://example.test', {
      headers: { Authorization: 'Bearer wrong' },
    }), 'release-secret')).toBe(false);
  });
});
