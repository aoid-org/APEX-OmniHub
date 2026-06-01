import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OmniSlatePane } from '../../apps/omnihub-site/dashboard/components/DashboardOverview/components/OmniSlatePane';
import { useOmniSlateStore } from '../../apps/omnihub-site/src/stores/omniSlateStore';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onDragOver, onDrop, className, style }: any) => (
      <div role="button" tabIndex={0} data-testid="framer-motion-div" onDragOver={onDragOver} onDrop={onDrop} className={className} style={style}>{children}</div>
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

describe('OmniSlate Context Drop', () => {
  beforeEach(() => {
    useOmniSlateStore.getState().clearContexts();
  });

  it('handles application/apex-tile drops', () => {
    render(<OmniSlatePane
      health="green" activeInsight={null} prompt="" isRecording={false} recordingDuration={0} traceLogs={[]}
      onCleanSlate={vi.fn()} onToggleGlobalInsight={vi.fn()} onToggleInsight={vi.fn()} onPromptChange={vi.fn()} onCommandSubmit={vi.fn()} onToggleRecording={vi.fn()}
    />);

    const dropZone = screen.getByTestId('framer-motion-div');
    const mockData = JSON.stringify({ kind: 'apex_app', label: 'Test App', id: 'test-123', health: 'healthy' });
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        types: ['application/apex-tile'],
        getData: (type: string) => type === 'application/apex-tile' ? mockData : '',
        files: []
      }
    });

    const store = useOmniSlateStore.getState();
    expect(store.contextItems).toHaveLength(1);
    expect(store.contextItems[0].kind).toBe('apex_app');
    expect(store.contextItems[0].label).toBe('Test App');
    expect(screen.getByText('Test App')).toBeInTheDocument();
  });

  it('handles FileList drops without auto-uploading', () => {
    render(<OmniSlatePane
      health="green" activeInsight={null} prompt="" isRecording={false} recordingDuration={0} traceLogs={[]}
      onCleanSlate={vi.fn()} onToggleGlobalInsight={vi.fn()} onToggleInsight={vi.fn()} onPromptChange={vi.fn()} onCommandSubmit={vi.fn()} onToggleRecording={vi.fn()}
    />);

    const dropZone = screen.getByTestId('framer-motion-div');
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.drop(dropZone, {
      dataTransfer: {
        types: ['Files'],
        getData: () => '',
        files: [file]
      }
    });

    const store = useOmniSlateStore.getState();
    expect(store.contextItems).toHaveLength(1);
    expect(store.contextItems[0].kind).toBe('file');
    expect(store.contextItems[0].label).toBe('test.txt');
    expect(store.contextItems[0].source).toBe('drag');
    // Ensure it doesn't auto-upload (metadata.uploading should not be true, or it's just raw file metadata)
    expect(store.contextItems[0].metadata).toHaveProperty('fileName', 'test.txt');
  });

  it('supports chip removal', () => {
    const store = useOmniSlateStore.getState();
    store.addContext({
      id: 'remove-me',
      kind: 'link',
      label: 'To Remove',
      source: 'drag',
      health: 'unknown',
      metadata: {},
      droppedAt: new Date().toISOString()
    });

    render(<OmniSlatePane
      health="green" activeInsight={null} prompt="" isRecording={false} recordingDuration={0} traceLogs={[]}
      onCleanSlate={vi.fn()} onToggleGlobalInsight={vi.fn()} onToggleInsight={vi.fn()} onPromptChange={vi.fn()} onCommandSubmit={vi.fn()} onToggleRecording={vi.fn()}
    />);

    const chip = screen.getByText('To Remove');
    expect(chip).toBeInTheDocument();

    const removeBtn = screen.getByTestId('remove-chip-remove-me');
    fireEvent.click(removeBtn);

    expect(useOmniSlateStore.getState().contextItems).toHaveLength(0);
  });

  it('submits prompt with context payload to MCP/agent', () => {
    const store = useOmniSlateStore.getState();
    store.addContext({
      id: 'ctx-1',
      kind: 'text',
      label: 'Context 1',
      source: 'system',
      health: 'healthy',
      metadata: {},
      droppedAt: new Date().toISOString()
    });

    const submitMock = vi.fn();
    render(<OmniSlatePane
      health="green" activeInsight={null} prompt="Do something" isRecording={false} recordingDuration={0} traceLogs={[]}
      onCleanSlate={vi.fn()} onToggleGlobalInsight={vi.fn()} onToggleInsight={vi.fn()} onPromptChange={vi.fn()} onCommandSubmit={submitMock} onToggleRecording={vi.fn()}
    />);

    const submitBtn = screen.getByTestId('submit-prompt');
    fireEvent.click(submitBtn);

    // The submit action should pass the prompt AND the context items
    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Do something',
        contextItems: expect.arrayContaining([
          expect.objectContaining({ id: 'ctx-1' })
        ])
      })
    );
  });
});
