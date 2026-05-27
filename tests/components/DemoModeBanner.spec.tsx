/**
 * DemoModeBanner + DemoModeToggle — Unit Tests
 * Tests demo mode indicator rendering and exit/enter behaviour.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockSetDemoMode = vi.fn();
const mockResetDemoStore = vi.fn();
const mockUseAccess = vi.fn();

vi.mock('@/contexts/AccessContext', () => ({
  useAccess: () => mockUseAccess(),
}));

vi.mock('@/stores/demoStore', () => ({
  useDemoStore: (selector: (s: { reset: () => void }) => unknown) =>
    selector({ reset: mockResetDemoStore }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { DemoModeBanner, DemoModeToggle } from '@/components/demo/DemoModeBanner';

// ─── DemoModeBanner ───────────────────────────────────────────────────────

describe('DemoModeBanner', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders banner when isDemo=true', () => {
    mockUseAccess.mockReturnValue({ isDemo: true, setDemoMode: mockSetDemoMode });
    render(<DemoModeBanner />);
    expect(screen.getByText(/Demo Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Changes are local only/i)).toBeInTheDocument();
  });

  it('renders nothing when isDemo=false', () => {
    mockUseAccess.mockReturnValue({ isDemo: false, setDemoMode: mockSetDemoMode });
    const { container } = render(<DemoModeBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('shows Exit Demo button when in demo mode', () => {
    mockUseAccess.mockReturnValue({ isDemo: true, setDemoMode: mockSetDemoMode });
    render(<DemoModeBanner />);
    expect(screen.getByRole('button', { name: /exit demo/i })).toBeInTheDocument();
  });

  it('calls setDemoMode(false) and resetDemoStore when Exit Demo is clicked', () => {
    mockUseAccess.mockReturnValue({ isDemo: true, setDemoMode: mockSetDemoMode });
    render(<DemoModeBanner />);
    fireEvent.click(screen.getByRole('button', { name: /exit demo/i }));
    expect(mockSetDemoMode).toHaveBeenCalledWith(false);
    expect(mockResetDemoStore).toHaveBeenCalledOnce();
  });
});

// ─── DemoModeToggle ───────────────────────────────────────────────────────

describe('DemoModeToggle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders Enter Demo Mode button when isDemo=false', () => {
    mockUseAccess.mockReturnValue({ isDemo: false, setDemoMode: mockSetDemoMode });
    render(<DemoModeToggle />);
    expect(screen.getByRole('button', { name: /enter demo mode/i })).toBeInTheDocument();
  });

  it('renders nothing when isDemo=true', () => {
    mockUseAccess.mockReturnValue({ isDemo: true, setDemoMode: mockSetDemoMode });
    const { container } = render(<DemoModeToggle />);
    expect(container.firstChild).toBeNull();
  });

  it('calls setDemoMode(true) when Enter Demo Mode is clicked', () => {
    mockUseAccess.mockReturnValue({ isDemo: false, setDemoMode: mockSetDemoMode });
    render(<DemoModeToggle />);
    fireEvent.click(screen.getByRole('button', { name: /enter demo mode/i }));
    expect(mockSetDemoMode).toHaveBeenCalledWith(true);
  });
});
