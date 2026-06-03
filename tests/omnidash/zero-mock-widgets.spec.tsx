/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect } from 'vitest';

// This test ensures we do not have mock data pretending to be live data in production.
describe('Zero-Mock Widgets Guardrails', () => {
  it.todo('requires all dashboard widgets to declare their data source explicitly');
});
