/**
 * OmniSlatePane — Component Tests
 * @module tests/omnidash/omni-slate-pane.spec
 *
 * OMNI-TEST UNIVERSAL — AAA pattern enforced.
 * Covers: label rendering, prompt input interaction, CleanSlate button,
 * submit button, health insight visibility, context tiles, trace log.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OmniSlatePane } from '@/dashboard/components/DashboardOverview/components/OmniSlatePane';
import type { OmniSlateContextItem } from '../../apps/omnihub-site/dashboard/types/context.types';
import { useOmniSlateStore } from '../../apps/omnihub-site/src/stores/omniSlateStore';

// lightbulb-icon.png asset mock
vi.mock('@/assets/lightbulb-icon.png', () => ({ default: 'lightbulb.png' }));



const SAMPLE_CONTEXT: readonly OmniSlateContextItem[] = [
  {
    id: 'ctx-tradeline',
    kind: 'apex_app',
    label: 'TradeLine',
    source: 'system',
    health: 'healthy',
    metadata: {},
    droppedAt: '2026-01-01T00:00:00Z',
    failureReason: 'All systems nominal',
  },
  {
    id: 'ctx-aspiral',
    kind: 'apex_app',
    label: 'aSpiral',
    source: 'system',
    health: 'warning',
    metadata: {},
    droppedAt: '2026-01-01T00:00:00Z',
    failureReason: 'Latency spike detected',
  },
];

const BASE_PROPS = {
  health: 'green' as const,
  activeInsight: null,
  prompt: '',
  isRecording: false,
  recordingDuration: 0,
  traceLogs: [] as string[],
  onCleanSlate: vi.fn(),
  onToggleGlobalInsight: vi.fn(),
  onToggleInsight: vi.fn(),
  onPromptChange: vi.fn(),
  onCommandSubmit: vi.fn(),
  onToggleRecording: vi.fn(),
};

describe('OmniSlatePane', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  beforeEach(() => {
    // Clear store before each test
    useOmniSlateStore.setState({ contextItems: [] });
  });

  describe('Static labels', () => {
    it('renders OmniSlate label', () => {
      render(<OmniSlatePane {...BASE_PROPS} />);
      expect(screen.getByText('OmniSlate')).toBeInTheDocument();
    });

    it('renders CleanSlate button', () => {
      render(<OmniSlatePane {...BASE_PROPS} />);
      expect(screen.getByText('CleanSlate')).toBeInTheDocument();
    });
  });

  describe('Prompt input', () => {
    it('renders prompt input with placeholder', () => {
      render(<OmniSlatePane {...BASE_PROPS} />);
      expect(screen.getByPlaceholderText('Ask APEX Agent')).toBeInTheDocument();
    });

    it('calls onPromptChange when user types', () => {
      const onPromptChange = vi.fn();
      render(<OmniSlatePane {...BASE_PROPS} onPromptChange={onPromptChange} />);

      const input = screen.getByPlaceholderText('Ask APEX Agent');
      fireEvent.change(input, { target: { value: 'Run audit' } });

      expect(onPromptChange).toHaveBeenCalledWith('Run audit');
    });

    it('displays current prompt value', () => {
      render(<OmniSlatePane {...BASE_PROPS} prompt="Hello APEX" />);
      const input = screen.getByPlaceholderText('Ask APEX Agent') as HTMLInputElement;
      expect(input.value).toBe('Hello APEX');
    });
  });

  describe('CleanSlate button', () => {
    it('calls onCleanSlate when clicked', () => {
      const onCleanSlate = vi.fn();
      render(<OmniSlatePane {...BASE_PROPS} onCleanSlate={onCleanSlate} />);

      fireEvent.click(screen.getByText('CleanSlate'));
      expect(onCleanSlate).toHaveBeenCalledOnce();
    });
  });

  describe('Submit button', () => {
    it('calls onCommandSubmit when submit button is clicked', () => {
      const onCommandSubmit = vi.fn();
      render(<OmniSlatePane {...BASE_PROPS} onCommandSubmit={onCommandSubmit} />);

      // Submit button renders the ▶ symbol
      const submitBtn = screen.getByText('▶').closest('button')!;
      fireEvent.click(submitBtn);
      expect(onCommandSubmit).toHaveBeenCalledOnce();
    });
  });

  describe('Health insight button', () => {
    it('does NOT show insight button when health is green', () => {
      render(<OmniSlatePane {...BASE_PROPS} health="green" />);
      expect(screen.queryByTitle('View health insights')).not.toBeInTheDocument();
    });

    it('shows insight button when health is yellow', () => {
      render(<OmniSlatePane {...BASE_PROPS} health="yellow" />);
      expect(screen.getByTitle('View health insights')).toBeInTheDocument();
    });

    it('shows insight button when health is red', () => {
      render(<OmniSlatePane {...BASE_PROPS} health="red" />);
      expect(screen.getByTitle('View health insights')).toBeInTheDocument();
    });

    it('calls onToggleGlobalInsight when insight button clicked', () => {
      const onToggleGlobalInsight = vi.fn();
      render(
        <OmniSlatePane
          {...BASE_PROPS}
          health="yellow"
          onToggleGlobalInsight={onToggleGlobalInsight}
        />,
      );

      fireEvent.click(screen.getByTitle('View health insights'));
      expect(onToggleGlobalInsight).toHaveBeenCalledOnce();
    });
  });

  describe('Context tiles', () => {
    it('renders context tiles when context items exist', () => {
      useOmniSlateStore.setState({ contextItems: [...SAMPLE_CONTEXT] });
      render(<OmniSlatePane {...BASE_PROPS} />);
      expect(screen.getByText('TradeLine')).toBeInTheDocument();
      expect(screen.getByText('aSpiral')).toBeInTheDocument();
    });

    it('renders "+ Add context" button when context items exist', () => {
      useOmniSlateStore.setState({ contextItems: [...SAMPLE_CONTEXT] });
      render(<OmniSlatePane {...BASE_PROPS} />);
      expect(screen.getByText('+ Add context')).toBeInTheDocument();
    });

    it('does NOT render context tiles when context is empty', () => {
      useOmniSlateStore.setState({ contextItems: [] });
      render(<OmniSlatePane {...BASE_PROPS} />);
      expect(screen.queryByText('+ Add context')).not.toBeInTheDocument();
    });

    it('shows context tile insight popup when activeInsight matches tile id', () => {
      useOmniSlateStore.setState({ contextItems: [...SAMPLE_CONTEXT] });
      render(
        <OmniSlatePane
          {...BASE_PROPS}
          activeInsight="ctx-tradeline"
        />,
      );
      expect(screen.getByText('All systems nominal')).toBeInTheDocument();
    });

    it('shows second tile insight popup when activeInsight matches second tile id', () => {
      useOmniSlateStore.setState({ contextItems: [...SAMPLE_CONTEXT] });
      render(
        <OmniSlatePane
          {...BASE_PROPS}
          activeInsight="ctx-aspiral"
        />,
      );
      expect(screen.getByText('Latency spike detected')).toBeInTheDocument();
    });

    it('calls onToggleInsight when a context tile is clicked', () => {
      useOmniSlateStore.setState({ contextItems: [...SAMPLE_CONTEXT] });
      const onToggleInsight = vi.fn();
      render(
        <OmniSlatePane
          {...BASE_PROPS}
          onToggleInsight={onToggleInsight}
        />,
      );
      fireEvent.click(screen.getByText('TradeLine'));
      // ContextTile calls onToggle(ctx.id)
      expect(onToggleInsight).toHaveBeenCalledWith('ctx-tradeline');
    });
  });

  describe('Global insight panel', () => {
    it('shows insight panel when activeInsight is __global__', () => {
      useOmniSlateStore.setState({ contextItems: [...SAMPLE_CONTEXT] });
      render(
        <OmniSlatePane
          {...BASE_PROPS}
          health="yellow"
          activeInsight="__global__"
        />,
      );
      // The panel shows non-healthy context items with their label + failureReason
      // aSpiral has health='warning' so it appears; TradeLine has health='healthy' so it is filtered out
      expect(screen.getByText('aSpiral:')).toBeInTheDocument();
      expect(screen.getByText('Latency spike detected')).toBeInTheDocument();
    });

    it('does NOT show global insight panel when activeInsight is null', () => {
      useOmniSlateStore.setState({ contextItems: [...SAMPLE_CONTEXT] });
      render(
        <OmniSlatePane
          {...BASE_PROPS}
          health="yellow"
          activeInsight={null}
        />,
      );
      expect(screen.queryByText('Latency spike detected')).not.toBeInTheDocument();
    });
  });

  describe('Trace logs', () => {
    it('renders first trace log when present', () => {
      render(
        <OmniSlatePane
          {...BASE_PROPS}
          traceLogs={['WORKFLOW COMPLETE — 3 steps']}
        />,
      );
      expect(screen.getByText('WORKFLOW COMPLETE — 3 steps')).toBeInTheDocument();
    });

    it('does NOT render trace log area when traceLogs is empty', () => {
      render(<OmniSlatePane {...BASE_PROPS} traceLogs={[]} />);
      // No trace log text present
      expect(screen.queryByText(/COMPLETE/i)).not.toBeInTheDocument();
    });
  });
});
