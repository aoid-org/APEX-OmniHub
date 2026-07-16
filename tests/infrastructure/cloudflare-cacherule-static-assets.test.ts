import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('cloudflare ruleset cache_rules static assets optimization', () => {
  const prodTfPath = resolve(process.cwd(), 'terraform/environments/production/cloudflare/main.tf');
  const modTfPath = resolve(process.cwd(), 'terraform/modules/cloudflare/main.tf');

  const prodTf = readFileSync(prodTfPath, 'utf8');
  const modTf = readFileSync(modTfPath, 'utf8');

  const expectedExpression = 'expression  = "(http.host eq \\"${var.domain}\\" and (starts_with(http.request.uri.path, \\"/assets/\\") or http.request.uri.path.extension in {\\"js\\" \\"css\\" \\"png\\" \\"jpg\\" \\"svg\\" \\"woff2\\"}) and not starts_with(http.request.uri.path, \\"/api/\\") and not starts_with(http.request.uri.path, \\"/functions/v1/\\"))"';

  it('asserts cache_rules in production main.tf matches static extensions and excludes /api/ and /functions/v1/', () => {
    expect(prodTf).toContain(expectedExpression);
    expect(prodTf).toContain('http.request.uri.path.extension in {\\"js\\" \\"css\\" \\"png\\" \\"jpg\\" \\"svg\\" \\"woff2\\"}');
    expect(prodTf).toContain('not starts_with(http.request.uri.path, \\"/api/\\")');
    expect(prodTf).toContain('not starts_with(http.request.uri.path, \\"/functions/v1/\\")');
  });

  it('asserts cache_rules in modules/cloudflare/main.tf matches static extensions and excludes /api/ and /functions/v1/', () => {
    expect(modTf).toContain(expectedExpression);
    expect(modTf).toContain('http.request.uri.path.extension in {\\"js\\" \\"css\\" \\"png\\" \\"jpg\\" \\"svg\\" \\"woff2\\"}');
    expect(modTf).toContain('not starts_with(http.request.uri.path, \\"/api/\\")');
    expect(modTf).toContain('not starts_with(http.request.uri.path, \\"/functions/v1/\\")');
  });
});
