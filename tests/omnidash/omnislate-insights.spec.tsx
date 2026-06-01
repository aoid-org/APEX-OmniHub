import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OmniSlatePane } from '../../apps/omnihub-site/dashboard/components/DashboardOverview/components/OmniSlatePane';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style }: any) => (
      <div data-testid="framer-motion-div" className={className} style={style}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useMotionValue: () => ({ get: () => 0, set: vi.fn() }),
}));

vi.mock('@/stores/omniDashStore', () => ({
  useOmniDash: vi.fn().mockImplementation((selector) => {
    if (typeof selector === 'function') {
      return { position: { x: 0, y: 0 }, zIndex: 100 };
    }
    return {
      openWidget: vi.fn(),
      moveWidget: vi.fn(),
      focusWidget: vi.fn(),
      widgets: new Map(),
    };
  })
}));

describe('OmniSlate Insights and Health', () => {
  it('computes red border if any broken context', () => {
    render(<OmniSlatePane
      health="red" activeInsight={null} prompt="" isRecording={false} recordingDuration={0} traceLogs={[]}
      onCleanSlate={vi.fn()} onToggleGlobalInsight={vi.fn()} onToggleInsight={vi.fn()} onPromptChange={vi.fn()} onCommandSubmit={vi.fn()} onToggleRecording={vi.fn()}
    />);
    const div = screen.getByTestId('framer-motion-div');
    // The tile should have the HC.red border applied from the style property
    expect(div.getAttribute('style')).toContain('border: 1px solid rgba(239, 68, 68');
  });

  it('computes amber border if any warning and no broken', () => {
    render(<OmniSlatePane
      health="yellow" activeInsight={null} prompt="" isRecording={false} recordingDuration={0} traceLogs={[]}
      onCleanSlate={vi.fn()} onToggleGlobalInsight={vi.fn()} onToggleInsight={vi.fn()} onPromptChange={vi.fn()} onCommandSubmit={vi.fn()} onToggleRecording={vi.fn()}
    />);
    const div = screen.getByTestId('framer-motion-div');
    expect(div.getAttribute('style')).toContain('border: 1px solid rgba(245, 158, 11');
  });

  it('computes green border if all known context is healthy', () => {
    render(<OmniSlatePane
      health="green" activeInsight={null} prompt="" isRecording={false} recordingDuration={0} traceLogs={[]}
      onCleanSlate={vi.fn()} onToggleGlobalInsight={vi.fn()} onToggleInsight={vi.fn()} onPromptChange={vi.fn()} onCommandSubmit={vi.fn()} onToggleRecording={vi.fn()}
    />);
    const div = screen.getByTestId('framer-motion-div');
    expect(div.getAttribute('style')).toContain('border: 1px solid rgba(16, 185, 129');
  });

  it('computes neutral border if no context', () => {
    // Assuming 'neutral' is mapped to HC['neutral'] or similar.
    // The test specifies we must support neutral, we will pass 'unknown' or empty slate logic in the component
    // If the component receives health="unknown", it should render neutral.
    // @ts-expect-error testing unknown health variant mapped to neutral
    render(<OmniSlatePane
      health="unknown" activeInsight={null} prompt="" isRecording={false} recordingDuration={0} traceLogs={[]}
      onCleanSlate={vi.fn()} onToggleGlobalInsight={vi.fn()} onToggleInsight={vi.fn()} onPromptChange={vi.fn()} onCommandSubmit={vi.fn()} onToggleRecording={vi.fn()}
    />);
    const div = screen.getByTestId('framer-motion-div');
    expect(div.getAttribute('style')).toContain('border: 1px solid rgba(148, 163, 184'); // Slate 400
  });

  it('shows subtle lightbulb glow only when insights exist and never auto-opens', () => {
    render(<OmniSlatePane
      health="yellow" activeInsight={null} prompt="" isRecording={false} recordingDuration={0} traceLogs={[]}
      onCleanSlate={vi.fn()} onToggleGlobalInsight={vi.fn()} onToggleInsight={vi.fn()} onPromptChange={vi.fn()} onCommandSubmit={vi.fn()} onToggleRecording={vi.fn()}
    />);
    
    // Lightbulb button should exist because health is yellow
    const lightbulb = screen.getByTitle('View health insights');
    expect(lightbulb).toBeInTheDocument();
    
    // The global insight panel should NOT be visible initially (activeInsight is null)
    expect(screen.queryByTestId('global-insights-panel')).not.toBeInTheDocument();
  });
});
