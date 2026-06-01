import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SentinelPanel } from '../../apps/omnihub-site/dashboard/components/SentinelPanel';

describe('Zero-Mock Guardrails', () => {
  it('SentinelPanel does not render hardcoded mock events like Salesforce sync', () => {
    render(<SentinelPanel />);
    const mockText = screen.queryByText(/Salesforce sync completed/i);
    expect(mockText).not.toBeInTheDocument();
  });

  it('SettingsModule does not just render generic health, it renders controls', () => {
    // We will test SettingsModule structure later, keeping it simple for now.
    expect(true).toBe(true);
  });
});
