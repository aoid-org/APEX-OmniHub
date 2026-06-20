import { describe, it, expect } from 'vitest';
import { getActionCapability } from '../../apps/omnihub-site/dashboard/contracts/moduleActionCapabilities';

describe('moduleActionCapabilities', () => {
  it('returns backend_unavailable for known unsupported actions', () => {
    expect(getActionCapability('export-audit').status).toBe('backend_unavailable');
    expect(getActionCapability('create-rule').status).toBe('backend_unavailable');
    expect(getActionCapability('create-workflow').status).toBe('backend_unavailable');
    expect(getActionCapability('trigger-run').status).toBe('backend_unavailable');
    expect(getActionCapability('test-all').status).toBe('backend_unavailable');
  });

  it('returns requires_integration for actions needing external connections', () => {
    expect(getActionCapability('upload-file').status).toBe('requires_integration');
    expect(getActionCapability('delete-file').status).toBe('requires_integration');
    expect(getActionCapability('manage-plan').status).toBe('requires_integration');
    expect(getActionCapability('billing-portal').status).toBe('requires_integration');
  });

  it('returns implemented for unknown/supported actions', () => {
    expect(getActionCapability('add-link').status).toBe('implemented');
    expect(getActionCapability('unknown-action').status).toBe('implemented');
  });

  it('provides honest copy for blocked actions', () => {
    const cap = getActionCapability('upload-file');
    expect(cap.message).toContain('APEX Storage Provider');
  });
});
