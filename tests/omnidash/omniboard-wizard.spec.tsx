import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { OmniBoardWizard } from '../../apps/omnihub-site/dashboard/components/OmniBoardWizard';
import {
  FakeSpeechRecognition,
  type VoiceTestWindow,
} from './_speech-recognition-test-helpers';

// Hoist the invoke mock so the factory closure captures it (vi.mock is hoisted before imports).
const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'tenant-1' } } }),
    },
    functions: {
      invoke: mockInvoke,
    },
  },
}));

const voiceWindow = globalThis as unknown as VoiceTestWindow;

const fsmContext = {
  session_id: 'session-1',
  tenant_id: 'tenant-1',
  state: 'APP_IDENTIFICATION',
  trace_id: 'trace-1',
};

async function renderWizard(
  overrides: Partial<{ onComplete: () => void; onDismiss: () => void }> = {},
) {
  const onComplete = overrides.onComplete ?? vi.fn();
  const onDismiss = overrides.onDismiss ?? vi.fn();
  render(<OmniBoardWizard onComplete={onComplete} onDismiss={onDismiss} />);
  // Session auto-starts on mount; the input row appears once context loads.
  await waitFor(() => expect(screen.getByPlaceholderText('Type your response...')).toBeTruthy());
  return { onComplete, onDismiss };
}

describe('OmniBoardWizard', () => {
  beforeEach(() => {
    FakeSpeechRecognition.instances = [];
    // Default: session start succeeds and returns fsmContext.
    mockInvoke.mockResolvedValue({ data: fsmContext, error: null });
  });

  afterEach(() => {
    cleanup();
    delete voiceWindow.SpeechRecognition;
    vi.clearAllMocks();
  });

  it('starts an FSM session on mount and renders the input row', async () => {
    await renderWizard();
    expect(screen.getByText(/OmniBoard — App Integration/)).toBeTruthy();
    expect(mockInvoke).toHaveBeenCalledWith(
      'omnilink-port/omniboard-start',
      expect.objectContaining({ body: expect.objectContaining({ tenant_id: 'tenant-1' }) }),
    );
  });

  it('shows an inline error when voice is unsupported', async () => {
    await renderWizard();

    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));

    expect(screen.getByText('Voice input is not supported in this browser.')).toBeTruthy();
  });

  it('appends final transcripts to the input field while listening', async () => {
    voiceWindow.SpeechRecognition = FakeSpeechRecognition;
    await renderWizard();

    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));
    expect(screen.getByRole('button', { name: 'Stop voice input' })).toBeTruthy();

    const recognition = FakeSpeechRecognition.instances[0];
    fireEvent.change(screen.getByPlaceholderText('Type your response...'), {
      target: { value: 'connect' },
    });
    recognition.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'salesforce' } }],
    });

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Type your response...') as HTMLInputElement;
      expect(input.value).toBe('connect salesforce');
    });
  });

  it('shows an inline error when voice capture fails', async () => {
    voiceWindow.SpeechRecognition = FakeSpeechRecognition;
    await renderWizard();

    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));
    const recognition = FakeSpeechRecognition.instances[0];
    recognition.onerror?.(new Event('error'));

    await waitFor(() =>
      expect(screen.getByText('Voice capture failed. Please retry.')).toBeTruthy(),
    );
    expect(screen.getByRole('button', { name: 'Start voice input' })).toBeTruthy();
  });

  // PR #1516: the modal chrome (OmniSpatialHost) owns the single Close control,
  // so the wizard no longer renders its own ✕. Voice capture is released on
  // unmount instead, so closing via the chrome X / backdrop / Esc still stops it.
  it('does not render its own close control (chrome owns Close)', async () => {
    await renderWizard();
    expect(screen.queryByRole('button', { name: '✕' })).toBeNull();
  });

  it('stops voice capture on unmount', async () => {
    voiceWindow.SpeechRecognition = FakeSpeechRecognition;
    const { unmount } = render(<OmniBoardWizard onComplete={vi.fn()} onDismiss={vi.fn()} />);
    await waitFor(() => expect(screen.getByPlaceholderText('Type your response...')).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));
    const recognition = FakeSpeechRecognition.instances[0];

    unmount();
    expect(recognition.stop).toHaveBeenCalled();
  });

  it('sends a turn and completes when the FSM reaches COMPLETION', async () => {
    const connectionSpec = { provider: 'salesforce' };
    mockInvoke
      .mockResolvedValueOnce({ data: fsmContext, error: null })
      .mockResolvedValueOnce({
        data: {
          context: { ...fsmContext, state: 'COMPLETION' },
          message: 'Connected.',
          connection_spec: connectionSpec,
        },
        error: null,
      });
    const { onComplete } = await renderWizard();

    fireEvent.change(screen.getByPlaceholderText('Type your response...'), {
      target: { value: 'Connect Salesforce' },
    });
    fireEvent.click(screen.getByRole('button', { name: '→' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(connectionSpec));
    expect(mockInvoke).toHaveBeenCalledWith(
      'omnilink-port/omniboard-next',
      expect.objectContaining({ body: expect.objectContaining({ session_id: 'session-1' }) }),
    );
  });

  it('surfaces an error when the session start fails', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Gateway unavailable') });
    render(<OmniBoardWizard onComplete={vi.fn()} onDismiss={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Gateway unavailable')).toBeTruthy());
  });

  it('surfaces an explicit timeout error when the connection service does not respond', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('omniboard_timeout') });
    render(<OmniBoardWizard onComplete={vi.fn()} onDismiss={vi.fn()} />);

    await waitFor(() =>
      expect(
        screen.getByText(/Connection service timed out\./),
      ).toBeTruthy(),
    );
  });

  it('surfaces a network error when the invoke call rejects', async () => {
    mockInvoke.mockRejectedValue(new Error('Network failure'));
    render(<OmniBoardWizard onComplete={vi.fn()} onDismiss={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByText('Network failure')).toBeTruthy(),
    );
  });
});
