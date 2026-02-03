/* VALUATION_IMPACT: Validates blueprint schema compliance for marketplace quality */
/* Generated: 2026-02-03 */
import { describe, expect, it } from 'vitest';
import dealerFlow from '@/blueprints/samples/DEALER_SERVICE_FLOW.json';
import { WorkflowSchema } from '@/blueprints/schema';

describe('Blueprint schema', () => {
  it('accepts valid dealer flow', () => {
    expect(() => WorkflowSchema.parse(dealerFlow)).not.toThrow();
  });

  it('rejects names below minimum length', () => {
    expect(() => WorkflowSchema.parse({ ...dealerFlow, name: 'ab' })).toThrow();
  });

  it('rejects non-semver versions', () => {
    expect(() => WorkflowSchema.parse({ ...dealerFlow, version: 'v1' })).toThrow();
  });

  it('rejects missing steps array', () => {
    const { steps, ...partial } = dealerFlow as Record<string, unknown>;
    expect(() => WorkflowSchema.parse(partial)).toThrow();
  });

  it('rejects invalid trigger types', () => {
    expect(() => WorkflowSchema.parse({
      ...dealerFlow,
      triggers: [{ type: 'webhook', config: { path: '/invalid' } }]
    })).toThrow();
  });
});
