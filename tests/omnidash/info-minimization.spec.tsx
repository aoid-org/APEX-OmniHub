

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HiddenMetric } from '@/dashboard/components/HiddenMetric';
import { Activity } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

describe('Info Minimization UX (Phase A.5)', () => {
  it('renders icon-only trigger without exposing raw telemetry text', () => {
    const { container } = render(
      <TooltipProvider delayDuration={0}>
        <HiddenMetric icon={Activity as any} label="telemetry-ping" value="42ms" />
      </TooltipProvider>
    );

    // Raw value must NOT appear in the initial DOM
    expect(container.textContent).not.toContain('42ms');
    // Icon trigger must be in the document
    expect(screen.getByTestId('telemetry-trigger-telemetry-ping')).toBeInTheDocument();
  });

  it('reveals telemetry data on hover or focus via Tooltip', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <HiddenMetric icon={Activity as any} label="latency" value="15ms" />
      </TooltipProvider>
    );

    const trigger = screen.getByTestId('telemetry-trigger-latency');

    // Fire hover using userEvent
    await user.hover(trigger);

    await waitFor(() => {
      const tooltip = screen.getByTestId('telemetry-tooltip-latency');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('latency');
      expect(tooltip).toHaveTextContent('15ms');
    });
  });
});
