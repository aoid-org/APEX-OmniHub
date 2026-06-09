import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../apps/omnihub-site/src/contexts/DemoModeContext', () => ({
  useDemoMode: vi.fn(() => ({
    demoMode: true,
    autoPilot: false,
    guardianMode: true,
    setDemoMode: vi.fn(),
    setAutoPilot: vi.fn(),
    setGuardianMode: vi.fn(),
  })),
}));

import { SentinelPanel } from '../../apps/omnihub-site/dashboard/components/SentinelPanel';
import { useDemoMode } from '../../apps/omnihub-site/src/contexts/DemoModeContext';

describe('SentinelPanel', () => {
  const setDemoMode = vi.fn();
  const setAutoPilot = vi.fn();
  const setGuardianMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDemoMode).mockReturnValue({
      demoMode: true,
      autoPilot: false,
      guardianMode: true,
      setDemoMode,
      setAutoPilot,
      setGuardianMode,
    });
  });

  it('renders Ops Controls section title', () => {
    render(<SentinelPanel />);
    expect(screen.getByText('Ops Controls')).toBeTruthy();
  });

  it('renders all three toggle controls', () => {
    render(<SentinelPanel />);
    expect(screen.getByText('Demo Mode')).toBeTruthy();
    expect(screen.getByText('Auto-Pilot')).toBeTruthy();
    expect(screen.getByText('Guardian Mode')).toBeTruthy();
  });

  it('renders sublabels for each toggle', () => {
    render(<SentinelPanel />);
    expect(screen.getByText('Simulated data feed')).toBeTruthy();
    expect(screen.getByText('Autonomous task handling')).toBeTruthy();
    expect(screen.getByText('AI policy enforcement')).toBeTruthy();
  });

  it('calls setDemoMode when demo toggle clicked', () => {
    render(<SentinelPanel />);
    fireEvent.click(screen.getByLabelText('Toggle demo mode'));
    expect(setDemoMode).toHaveBeenCalledWith(false);
  });

  it('calls setAutoPilot when auto-pilot toggle clicked', () => {
    render(<SentinelPanel />);
    fireEvent.click(screen.getByLabelText('Toggle auto pilot'));
    expect(setAutoPilot).toHaveBeenCalledWith(true);
  });

  it('calls setGuardianMode when guardian toggle clicked', () => {
    render(<SentinelPanel />);
    fireEvent.click(screen.getByLabelText('Toggle guardian mode'));
    expect(setGuardianMode).toHaveBeenCalledWith(false);
  });
});
