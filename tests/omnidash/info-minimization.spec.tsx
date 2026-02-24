import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HiddenMetric } from '@/components/omnidash/HiddenMetric';
import { Activity } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

describe('Info Minimization UX (Phase A.5)', () => {
  it('renders strictly as an icon by default with hidden visually-accessible labels', () => {
    const { container } = render(
      <TooltipProvider delayDuration={0}>
        <HiddenMetric icon={Activity} label="telemetry-ping" value="42ms" />
      </TooltipProvider>
    );

    // ensure exact canonical behavior
    const trigger = screen.getByTestId('telemetry-telemetry-ping');
    expect(trigger).toBeInTheDocument();
    
    // ensure the actual value text doesn't pollute the DOM initially
    expect(screen.queryByText('42ms')).not.toBeInTheDocument();
  });

  it('reveals telemetry data on hover or focus via Tooltip', async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <HiddenMetric icon={Activity} label="latency" value="15ms" />
      </TooltipProvider>
    );

    const trigger = screen.getByTestId('telemetry-latency');
    
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
