import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('cloudflare ruleset ratelimit expressions', () => {
  const tfPath = resolve(process.cwd(), 'terraform/modules/cloudflare/main.tf');
  const tf = readFileSync(tfPath, 'utf8');

  it('pins API rule expression to host + /api prefix', () => {
    expect(tf).toContain('expression  = "(http.host eq \\"${var.domain}\\" and starts_with(http.request.uri.path, \\"/api/\\"))"');
  });

  it('pins sensitive rule expression to host + exact path', () => {
    expect(tf).toContain('expression  = "(http.host eq \\"${var.domain}\\" and http.request.uri.path eq \\"${rules.value}\\")"');
  });

  it('keeps sensitive endpoint list explicit and complete', () => {
    expect(tf).toContain('"/functions/v1/web3-verify"');
    expect(tf).toContain('"/functions/v1/web3-nonce"');
    expect(tf).toContain('"/functions/v1/apex-voice"');
  });
});
