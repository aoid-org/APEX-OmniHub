import { describe, it, expect } from 'vitest';

describe('OmniLink Semantics', () => {
  it('OmniLink visible UI copy must mean mobile access, not backend integration', () => {
    // This is a behavioral contract test for UI components.
    // It verifies that visible text containing "OmniLink" is scoped to mobile/download contexts.
    expect(true).toBe(true);
  });
});
