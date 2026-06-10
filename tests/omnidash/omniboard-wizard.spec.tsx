import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { OmniBoardWizard } from '../../apps/omnihub-site/dashboard/components/OmniBoardWizard';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'tenant-1' } } }),
    },
  },
}));

/** Minimal controllable double for the browser SpeechRecognition API. */
class FakeSpeechRecognition extends EventTarget {
  static instances: FakeSpeechRecognition[] = [];

  continuous = true;
  interimResults = true;
  lang = '';
  onerror: ((event: Event) => void) | null = null;
  onend: (() => void) | null = null;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null = null;
  start = vi.fn();
  stop = vi.fn(() => {
    this.onend?.();
  });

  constructor() {
    super();
    FakeSpeechRecognition.instances.push(this);
  }
}

interface VoiceTestWindow extends Window {
  SpeechRecognition?: new () => FakeSpeechRecognition;
}

const voiceWindow = window as VoiceTestWindow;

const fsmContext = {
  session_id: 'session-1',
  tenant_id: 'tenant-1',
  state: 'APP_IDENTIFICATION',
  trace_id: 'trace-1',
};

function mockStartFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(fsmContext),
  });
}

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
    vi.stubGlobal('fetch', mockStartFetch());
  });

  afterEach(() => {
    cleanup();
    delete voiceWindow.SpeechRecognition;
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('starts an FSM session on mount and renders the input row', async () => {
    await renderWizard();
    expect(screen.getByText(/OmniBoard — Connect App/)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/omniboard/start?tenant_id=tenant-1'),
      expect.objectContaining({ method: 'POST' }),
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

  it('stops voice capture and notifies the host on dismiss', async () => {
    voiceWindow.SpeechRecognition = FakeSpeechRecognition;
    const { onDismiss } = await renderWizard();

    fireEvent.click(screen.getByRole('button', { name: 'Start voice input' }));
    const recognition = FakeSpeechRecognition.instances[0];
    fireEvent.click(screen.getByRole('button', { name: '✕' }));

    expect(recognition.stop).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('sends a turn and completes when the FSM reaches COMPLETION', async () => {
    const connectionSpec = { provider: 'salesforce' };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(fsmContext) })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            context: { ...fsmContext, state: 'COMPLETION' },
            message: 'Connected.',
            connection_spec: connectionSpec,
          }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const { onComplete } = await renderWizard();

    fireEvent.change(screen.getByPlaceholderText('Type your response...'), {
      target: { value: 'Connect Salesforce' },
    });
    fireEvent.click(screen.getByRole('button', { name: '→' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(connectionSpec));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/omniboard/session-1/next'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('surfaces an error when the session start fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    render(<OmniBoardWizard onComplete={vi.fn()} onDismiss={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('FSM start failed: 503')).toBeTruthy());
  });
});
