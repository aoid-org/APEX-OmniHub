import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SentinelPanel } from '../../apps/omnihub-site/dashboard/components/SentinelPanel';

// We need to mock the context
const mockSetDemoMode = vi.fn();
const mockSetAutoPilot = vi.fn();
const mockSetGuardianMode = vi.fn();

vi.mock('../../apps/omnihub-site/src/contexts/DemoModeContext', () => ({
  useDemoMode: () => ({
    demoMode: false,
    setDemoMode: mockSetDemoMode,
    autoPilot: false,
    setAutoPilot: mockSetAutoPilot,
    guardianMode: false,
    setGuardianMode: mockSetGuardianMode,
  })
}));

describe('Ops Controls Contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('must render toggles for Demo Mode, Auto-Pilot, and Guardian Mode', () => {
    render(<SentinelPanel />);
    expect(screen.getByRole('button', { name: /Toggle demo mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Toggle auto pilot/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Toggle guardian mode/i })).toBeInTheDocument();
  });

  it('must safely debounce toggle actions to prevent race conditions during rapid clicks', async () => {
    render(<SentinelPanel />);
    const demoToggle = screen.getByRole('button', { name: /Toggle demo mode/i });
    
    // Fire rapid clicks
    fireEvent.click(demoToggle);
    fireEvent.click(demoToggle);
    fireEvent.click(demoToggle);

    // It should aggressively debounce rapid clicks so it only calls the underlying setter once
    // per batch or after a small delay (e.g., 200ms)
    await waitFor(() => {
      // Due to debouncing, it should be called exactly once instead of 3 times
      expect(mockSetDemoMode).toHaveBeenCalledTimes(1);
    }, { timeout: 500 });
  });

  it('must display optimistic visual state updates instantly regardless of debounce', () => {
    render(<SentinelPanel />);
    const autoPilotToggle = screen.getByRole('button', { name: /Toggle auto pilot/i });
    
    expect(autoPilotToggle.className).not.toMatch(/\bon\b/);
    
    // Click toggle
    fireEvent.click(autoPilotToggle);
    
    // Even though underlying state dispatch is debounced, visual state MUST update immediately
    expect(autoPilotToggle.className).toMatch(/\bon\b/);
  });
});
