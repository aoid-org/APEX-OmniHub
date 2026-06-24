/**
 * HiddenMetric + HiddenValue - Component Tests
 * @module tests/omnidash/hidden-metric.spec
 *
 * OMNI-TEST UNIVERSAL - AAA pattern enforced.
 * TooltipContent (Radix UI) is portal-rendered and only visible on hover.
 * Tests verify trigger accessibility and HiddenValue rendering.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  HiddenMetric,
  HiddenValue,
} from '@/dashboard/components/HiddenMetric';
import { TooltipProvider } from '@/components/ui/tooltip';
const MockIcon = Object.assign(
  ({ className }: { className?: string }) => (
    <svg data-testid="mock-icon" className={className} aria-hidden="true" />
  ),
  { displayName: 'MockIcon' },
) as React.ElementType<{ className?: string }>;

function wrap(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe('HiddenMetric', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders trigger with correct data-testid', () => {
    wrap(<HiddenMetric icon={MockIcon} label="Memory Usage" value="72%" />);
    expect(screen.getByTestId('telemetry-trigger-Memory Usage')).toBeInTheDocument();
  });

  it('renders trigger with aria-label matching label prop', () => {
    wrap(<HiddenMetric icon={MockIcon} label="CPU" value="45%" />);
    expect(screen.getByTestId('telemetry-trigger-CPU')).toHaveAttribute('aria-label', 'CPU');
  });

  it('renders the icon inside the trigger', () => {
    wrap(<HiddenMetric icon={MockIcon} label="Lat" value="12ms" />);
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('icon has aria-hidden attribute', () => {
    wrap(<HiddenMetric icon={MockIcon} label="X" value="v" />);
    expect(screen.getByTestId('mock-icon')).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies className prop to the trigger button', () => {
    wrap(<HiddenMetric icon={MockIcon} label="Test" value="v" className="my-cls" />);
    expect(screen.getByTestId('telemetry-trigger-Test')).toHaveClass('my-cls');
  });

  it('renders without crashing with no optional props', () => {
    expect(() =>
      wrap(<HiddenMetric icon={MockIcon} label="Basic" value="1" />),
    ).not.toThrow();
  });

  it('renders multiple HiddenMetric with distinct labels without conflict', () => {
    wrap(
      <>
        <HiddenMetric icon={MockIcon} label="A" value="1" />
        <HiddenMetric icon={MockIcon} label="B" value="2" />
      </>,
    );
    expect(screen.getByTestId('telemetry-trigger-A')).toBeInTheDocument();
    expect(screen.getByTestId('telemetry-trigger-B')).toBeInTheDocument();
  });
});

describe('HiddenValue', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders string value text', () => {
    render(<HiddenValue value="42 pts" />);
    expect(screen.getByText('42 pts')).toBeInTheDocument();
  });

  it('renders with custom icon component', () => {
    const CustomIcon = ({ className }: { className?: string }) => (
      <svg data-testid="custom-icon" className={className} />
    );
    render(<HiddenValue icon={CustomIcon} value="100%" />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders default bullet icon when no icon provided', () => {
    render(<HiddenValue value="N/A" />);
    expect(screen.getByText('\u2022')).toBeInTheDocument();
  });

  it('renders ReactNode value', () => {
    render(<HiddenValue value={<span data-testid="rich-value">Rich</span>} />);
    expect(screen.getByTestId('rich-value')).toBeInTheDocument();
  });

  it('applies valueClass to the revealed span', () => {
    const { container } = render(
      <HiddenValue value="99" valueClass="font-bold text-green-400" />,
    );
    expect(container.querySelector('.font-bold')).not.toBeNull();
    expect(container.querySelector('.text-green-400')).not.toBeNull();
  });

  it('renders without icon when value is empty string', () => {
    const { container } = render(<HiddenValue value="" />);
    expect(container).not.toBeNull();
  });
});
