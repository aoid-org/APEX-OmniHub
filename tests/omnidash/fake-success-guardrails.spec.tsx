import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Fake Success Guardrails', () => {
  it('prevents local module launches from being marked backend-confirmed LIVE', () => {
    const source = readFileSync('src/omnidash/useOmniDashAction.ts', 'utf8');

    expect(source).toContain("status: 'LOCAL_LAUNCHED'");
    expect(source).toContain("confirmation: 'local-launch-only'");
    expect(source).toContain('requiresBackendConfirmation: true');
    expect(source).not.toMatch(/No backend exchange[^]*status:\s*'LIVE'/);
  });

  it('keeps OAuth success dependent on Supabase Edge Function completion', () => {
    const source = readFileSync('src/omnidash/useOmniDashAction.ts', 'utf8');

    expect(source).toContain("supabase.functions.invoke(");
    expect(source).toContain("'apex-agent'");
    expect(source).toContain("action: 'oauth_exchange'");
    expect(source).toContain('if (error) throw error;');
    expect(source).toMatch(/if \(directive\.type === 'oauth'\)[^]*status:\s*'LIVE'/);
  });
});
