import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceInterface from '@/components/VoiceInterface';

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/utils/RealtimeAudio', () => ({
  AudioRecorder: class {
    start = vi.fn(async () => {});
    stop = vi.fn();
  },
  encodeAudioForAPI: () => '',
  playAudioData: vi.fn(),
  clearAudioQueue: vi.fn(),
}));

vi.mock('@/lib/monitoring', () => ({
  logAnalyticsEvent: vi.fn(),
}));

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onclose: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: unknown) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send() {}
  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({} as unknown);
  }

  triggerError() {
    this.onerror?.({} as unknown);
  }
}

describe('VoiceInterface backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWebSocket.instances = [];
    // @ts-expect-error - mocking WebSocket for tests
    global.WebSocket = MockWebSocket;
    // @ts-expect-error - mocking AudioContext for tests
    global.AudioContext = class {
      destination = {};
      close = vi.fn();
    };
    // @ts-expect-error - mocking mediaDevices for tests
    navigator.mediaDevices = {
      getUserMedia: vi.fn(async () => ({})),
    };
  });

  async function exhaustRetries() {
    render(<VoiceInterface />);

    await act(async () => {
      fireEvent.click(screen.getByText(/Start Voice Chat/i));
    });

    for (let i = 0; i < 2; i++) {
      await act(async () => {
        MockWebSocket.instances[i].triggerError();
        vi.advanceTimersByTime(11_000);
      });
    }

    await act(async () => {
      MockWebSocket.instances[2].triggerError();
    });
  }

  it('enters degraded mode after retry exhaustion', async () => {
    await exhaustRetries();
    expect(screen.getByText(/Voice connection degraded/i)).toBeInTheDocument();
  });

  it('shows fallback action buttons in degraded mode', async () => {
    await exhaustRetries();
    expect(screen.getByText(/Use fallback/i)).toBeInTheDocument();
    expect(screen.getByText(/Continue offline/i)).toBeInTheDocument();
  });

  it('shows "Retry Voice" label on the start button when in degraded mode', async () => {
    await exhaustRetries();
    // The Retry button inside the degraded banner
    expect(screen.getAllByRole('button', { name: /Retry/i }).length).toBeGreaterThan(0);
  });

  it('renders "End Voice Chat" button when connected and allows ending', async () => {
    render(<VoiceInterface />);

    await act(async () => {
      fireEvent.click(screen.getByText(/Start Voice Chat/i));
    });

    const ws = MockWebSocket.instances[0];
    await act(async () => {
      ws.readyState = MockWebSocket.OPEN;
      ws.onopen?.({});
    });

    expect(screen.getByText(/End Voice Chat/i)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText(/End Voice Chat/i));
    });

    expect(screen.getByText(/Start Voice Chat/i)).toBeInTheDocument();
  });

  it('shows "Connecting..." during connection setup', async () => {
    render(<VoiceInterface />);

    await act(async () => {
      fireEvent.click(screen.getByText(/Start Voice Chat/i));
    });

    // Before ws.onopen fires — should still be connecting
    expect(screen.getByText(/Connecting\.\.\./i)).toBeInTheDocument();
  });
});

