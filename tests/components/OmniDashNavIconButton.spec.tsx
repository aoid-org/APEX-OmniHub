/**
 * OmniDashNavIconButton — Unit Tests
 * Tests SPA navigation button rendering, accessibility, and active state.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Home, Settings, BarChart2 } from 'lucide-react';

// ─── Tooltip mock (Radix UI) ─────────────────────────────────────────────

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <span>{children}</span>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}));

// ─── Import after mocks ───────────────────────────────────────────────────

import { OmniDashNavIconButton } from '@/components/OmniDashNavIconButton';

// ─── Tests ────────────────────────────────────────────────────────────────

describe('OmniDashNavIconButton', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('rendering', () => {
    it('renders a button with the label', () => {
      const onClick = vi.fn();
      render(<OmniDashNavIconButton onClick={onClick} label="Dashboard" icon={Home} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      // Label appears in both button span and tooltip — getAllByText handles multiple matches
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    });

    it('renders with correct data-testid based on label', () => {
      render(<OmniDashNavIconButton onClick={vi.fn()} label="My Settings" icon={Settings} />);
      expect(screen.getByTestId('omnidash-nav-my-settings')).toBeInTheDocument();
    });

    it('renders data-testid with hyphens replacing spaces', () => {
      render(<OmniDashNavIconButton onClick={vi.fn()} label="Agent Control" icon={BarChart2} />);
      expect(screen.getByTestId('omnidash-nav-agent-control')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('sets aria-label to label when no shortcut', () => {
      render(<OmniDashNavIconButton onClick={vi.fn()} label="Home" icon={Home} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-label', 'Home');
    });

    it('includes shortcut in aria-label when shortcut is provided', () => {
      render(
        <OmniDashNavIconButton onClick={vi.fn()} label="Home" icon={Home} shortcut="H" />
      );
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-label', 'Home (Shortcut: H)');
    });

    it('sets aria-pressed=true when isActive=true', () => {
      render(<OmniDashNavIconButton onClick={vi.fn()} label="Home" icon={Home} isActive={true} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('sets aria-pressed=false when isActive=false', () => {
      render(<OmniDashNavIconButton onClick={vi.fn()} label="Home" icon={Home} isActive={false} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });

    it('defaults isActive to false', () => {
      render(<OmniDashNavIconButton onClick={vi.fn()} label="Home" icon={Home} />);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('click handling', () => {
    it('calls onClick when button is clicked', () => {
      const onClick = vi.fn();
      render(<OmniDashNavIconButton onClick={onClick} label="Home" icon={Home} />);
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledOnce();
    });

    it('calls onClick on each click (multiple clicks)', () => {
      const onClick = vi.fn();
      render(<OmniDashNavIconButton onClick={onClick} label="Home" icon={Home} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByRole('button'));
      fireEvent.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('active state styling', () => {
    it('applies primary background class when active', () => {
      render(<OmniDashNavIconButton onClick={vi.fn()} label="Home" icon={Home} isActive={true} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('bg-primary');
    });

    it('applies hover accent class when inactive', () => {
      render(<OmniDashNavIconButton onClick={vi.fn()} label="Home" icon={Home} isActive={false} />);
      const btn = screen.getByRole('button');
      expect(btn.className).toContain('hover:bg-accent');
    });
  });

  describe('tooltip content', () => {
    it('renders label in tooltip content', () => {
      render(<OmniDashNavIconButton onClick={vi.fn()} label="Analytics" icon={BarChart2} />);
      expect(screen.getByTestId('tooltip-content')).toHaveTextContent('Analytics');
    });

    it('renders shortcut in tooltip when provided', () => {
      render(
        <OmniDashNavIconButton onClick={vi.fn()} label="Analytics" icon={BarChart2} shortcut="A" />
      );
      expect(screen.getByTestId('tooltip-content')).toHaveTextContent('A');
    });
  });
});
