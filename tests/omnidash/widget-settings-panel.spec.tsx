import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetSettingsPanel } from '../../apps/omnihub-site/dashboard/components/WidgetSettingsModal';

const defaultProps = {
  hiddenWidgets: [] as readonly string[],
  panelLayout: 'standard' as const,
  onToggleWidget: vi.fn(),
  onSetPanelLayout: vi.fn(),
  onResetPositions: vi.fn(),
  onClose: vi.fn(),
};

describe('WidgetSettingsPanel', () => {
  it('renders the canvas widgets section', () => {
    render(<WidgetSettingsPanel {...defaultProps} />);
    expect(screen.getByText('Canvas Widgets')).toBeTruthy();
  });

  it('renders all 11 canvas widget labels', () => {
    render(<WidgetSettingsPanel {...defaultProps} />);
    expect(screen.getByText('APEX Agent')).toBeTruthy();
    expect(screen.getByText('OmniSlate AI')).toBeTruthy();
    expect(screen.getByText('Ecosystem')).toBeTruthy();
    expect(screen.getByText('System Health Overview')).toBeTruthy();
  });

  it('toggle switch is enabled (on) when widget is visible', () => {
    render(<WidgetSettingsPanel {...defaultProps} hiddenWidgets={[]} />);
    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('toggle switch is disabled (off) when widget is hidden', () => {
    render(
      <WidgetSettingsPanel
        {...defaultProps}
        hiddenWidgets={['widget_agent']}
      />,
    );
    const agentSwitch = screen.getAllByRole('switch')[0];
    expect(agentSwitch).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onToggleWidget when a toggle is clicked', () => {
    const onToggleWidget = vi.fn();
    render(<WidgetSettingsPanel {...defaultProps} onToggleWidget={onToggleWidget} />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    expect(onToggleWidget).toHaveBeenCalledWith('widget_agent');
  });

  it('renders Panel Layout section with Standard and Reversed options', () => {
    render(<WidgetSettingsPanel {...defaultProps} />);
    expect(screen.getByText('Panel Layout')).toBeTruthy();
    expect(screen.getByText('Standard')).toBeTruthy();
    expect(screen.getByText('Reversed')).toBeTruthy();
  });

  it('calls onSetPanelLayout with "reversed" when Reversed clicked', () => {
    const onSetPanelLayout = vi.fn();
    render(<WidgetSettingsPanel {...defaultProps} onSetPanelLayout={onSetPanelLayout} />);
    fireEvent.click(screen.getByText('Reversed'));
    expect(onSetPanelLayout).toHaveBeenCalledWith('reversed');
  });

  it('calls onSetPanelLayout with "standard" when Standard clicked', () => {
    const onSetPanelLayout = vi.fn();
    render(
      <WidgetSettingsPanel
        {...defaultProps}
        panelLayout="reversed"
        onSetPanelLayout={onSetPanelLayout}
      />,
    );
    fireEvent.click(screen.getByText('Standard'));
    expect(onSetPanelLayout).toHaveBeenCalledWith('standard');
  });

  it('renders Reset Widget Positions button', () => {
    render(<WidgetSettingsPanel {...defaultProps} />);
    expect(screen.getByText('Reset Widget Positions')).toBeTruthy();
  });

  it('calls onResetPositions and onClose when Reset is clicked', () => {
    const onResetPositions = vi.fn();
    const onClose = vi.fn();
    render(
      <WidgetSettingsPanel
        {...defaultProps}
        onResetPositions={onResetPositions}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText('Reset Widget Positions'));
    expect(onResetPositions).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('reversed layout option appears active when panelLayout is reversed', () => {
    render(<WidgetSettingsPanel {...defaultProps} panelLayout="reversed" />);
    expect(screen.getByText('Insights left, nav right')).toBeTruthy();
  });
});
