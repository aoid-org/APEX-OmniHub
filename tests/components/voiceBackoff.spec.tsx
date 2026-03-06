import { fireEvent, render, screen } from '@testing-library/react';
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

  it('enters degraded mode after retry exhaustion', async () => {
    render(<VoiceInterface />);

    const startButton = screen.getByText(/Start Voice Chat/i);
    fireEvent.click(startButton);

    // startConversation is async (awaits getUserMedia); flush microtask queue
    // so the initial WebSocket constructor runs before we inspect instances
    await Promise.resolve();
    await Promise.resolve();

    expect(MockWebSocket.instances.length).toBeGreaterThan(0);

    // VITE_VOICE_MAX_RETRIES defaults to 3; trigger 2 errors that schedule
    // reconnect timeouts (attempts 1 and 2), then a 3rd that hits the >= limit
    // and calls handleDegraded() directly with no further timeout scheduled.
    for (let i = 0; i < 2; i++) {
      MockWebSocket.instances[i].triggerError();
      // Advance time past the backoff window (BASE=500, MAX=10000, JITTER=250)
      // so the reconnect setTimeout fires and a new WebSocket is created
      vi.advanceTimersByTime(11_000);
      // flush the connectVoice async chain (no getUserMedia on reconnect)
      await Promise.resolve();
    }

    // Third error: reconnectAttemptsRef = 2 → nextAttempt = 3 >= MAX_RETRIES(3)
    // → handleDegraded() called synchronously, no new timeout queued
    MockWebSocket.instances[2].triggerError();

    // Flush React state updates triggered by handleDegraded (setDegradedMode etc.)
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByText(/Voice connection degraded/i)).toBeInTheDocument();
  });
});

