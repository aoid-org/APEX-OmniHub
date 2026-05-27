/**
 * VoiceInterface — Unit Tests
 * Tests WebSocket lifecycle: initial render, connecting, connected, messages, and end conversation.
 * Uses same mock pattern as voiceBackoff.spec.tsx (the established working pattern).
 *
 * Important: No fake timers here — vi.useFakeTimers() conflicts with RTL's waitFor polling.
 * State assertions are made directly after await act(), which flushes all async React updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ─── Module-level mocks ───────────────────────────────────────────────────

const toastFn = vi.fn();

vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
}));

vi.mock('@/utils/RealtimeAudio', () => ({
  AudioRecorder: class {
    start = vi.fn(async () => {});
    stop = vi.fn();
  },
  encodeAudioForAPI: vi.fn(() => ''),
  playAudioData: vi.fn(),
  clearAudioQueue: vi.fn(),
}));

vi.mock('@/lib/monitoring', () => ({
  logAnalyticsEvent: vi.fn(),
}));

vi.mock('@/lib/backoff', () => ({
  calculateBackoffDelay: vi.fn().mockReturnValue(50),
}));

// ─── WebSocket Mock ───────────────────────────────────────────────────────

class MockWS {
  static readonly instances: MockWS[] = [];
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  readyState = MockWS.OPEN;
  onopen: ((e: unknown) => void) | null = null;
  onclose: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessage: ((e: unknown) => void) | null = null;
  send = vi.fn();
  close = vi.fn();

  constructor() {
    MockWS.instances.push(this);
  }

  triggerOpen() { this.onopen?.({}); }
  triggerMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
  triggerError() { this.onerror?.({}); }
  triggerClose() { this.readyState = MockWS.CLOSED; this.onclose?.({}); }
}

// ─── Import after mocks ───────────────────────────────────────────────────

import VoiceInterface from '@/components/VoiceInterface';
import { clearAudioQueue } from '@/utils/RealtimeAudio';
import { logAnalyticsEvent } from '@/lib/monitoring';

// ─── Test Setup ───────────────────────────────────────────────────────────

beforeEach(() => {
  MockWS.instances.length = 0;

  // @ts-expect-error — jsdom override (same as voiceBackoff.spec.tsx)
  globalThis.WebSocket = MockWS;
  // @ts-expect-error — jsdom override
  globalThis.AudioContext = class {
    sampleRate = 24000;
    close = vi.fn();
  };
  // @ts-expect-error — jsdom override
  navigator.mediaDevices = {
    getUserMedia: vi.fn(async () => ({})),
  };

  toastFn.mockClear();
  vi.mocked(clearAudioQueue).mockClear();
  vi.mocked(logAnalyticsEvent).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Helper ───────────────────────────────────────────────────────────────

/** Renders, clicks Start, and triggers WS open. All state settled after this. */
async function openConnection() {
  render(<VoiceInterface />);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /start voice chat/i }));
  });
  expect(MockWS.instances.length).toBeGreaterThan(0);
  await act(async () => {
    MockWS.instances[0].triggerOpen();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('VoiceInterface', () => {
  describe('initial render (idle)', () => {
    it('renders Start Voice Chat button', () => {
      render(<VoiceInterface />);
      expect(screen.getByRole('button', { name: /start voice chat/i })).toBeInTheDocument();
    });

    it('does not render End Voice Chat button in idle state', () => {
      render(<VoiceInterface />);
      expect(screen.queryByRole('button', { name: /end voice chat/i })).not.toBeInTheDocument();
    });

    it('does not show degraded banner in idle state', () => {
      render(<VoiceInterface />);
      expect(screen.queryByText(/voice connection degraded/i)).not.toBeInTheDocument();
    });

    it('start button is enabled in idle state', () => {
      render(<VoiceInterface />);
      expect(screen.getByRole('button', { name: /start voice chat/i })).not.toBeDisabled();
    });
  });

  describe('connecting state', () => {
    it('shows connecting state after button click', async () => {
      render(<VoiceInterface />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start voice chat/i }));
      });
      expect(MockWS.instances.length).toBeGreaterThan(0);
    });
  });

  describe('connected state', () => {
    it('shows End Voice Chat button after WS opens', async () => {
      await openConnection();
      expect(screen.getByRole('button', { name: /end voice chat/i })).toBeInTheDocument();
    });

    it('logs voice.ws.retry.success analytics on open', async () => {
      await openConnection();
      expect(vi.mocked(logAnalyticsEvent)).toHaveBeenCalledWith(
        'voice.ws.retry.success',
        expect.objectContaining({ reconnect: false })
      );
    });

    it('shows Voice Active toast on connection', async () => {
      await openConnection();
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Voice Active' })
      );
    });

    it('calls onTranscript(delta, false) on audio_transcript.delta message', async () => {
      const onTranscript = vi.fn();
      render(<VoiceInterface onTranscript={onTranscript} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start voice chat/i }));
      });
      await act(async () => { MockWS.instances[0].triggerOpen(); });
      await act(async () => {
        MockWS.instances[0].triggerMessage({ type: 'response.audio_transcript.delta', delta: 'Hello' });
      });
      expect(onTranscript).toHaveBeenCalledWith('Hello', false);
    });

    it('calls onTranscript(text, true) on audio_transcript.done message', async () => {
      const onTranscript = vi.fn();
      render(<VoiceInterface onTranscript={onTranscript} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start voice chat/i }));
      });
      await act(async () => { MockWS.instances[0].triggerOpen(); });
      await act(async () => {
        MockWS.instances[0].triggerMessage({ type: 'response.audio_transcript.done', transcript: 'Done text' });
      });
      expect(onTranscript).toHaveBeenCalledWith('Done text', true);
    });

    it('calls onSpeakingChange(true) on response.created', async () => {
      const onSpeakingChange = vi.fn();
      render(<VoiceInterface onSpeakingChange={onSpeakingChange} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start voice chat/i }));
      });
      await act(async () => { MockWS.instances[0].triggerOpen(); });
      await act(async () => {
        MockWS.instances[0].triggerMessage({ type: 'response.created' });
      });
      expect(onSpeakingChange).toHaveBeenCalledWith(true);
    });

    it('calls onSpeakingChange(false) on response.audio.done', async () => {
      const onSpeakingChange = vi.fn();
      render(<VoiceInterface onSpeakingChange={onSpeakingChange} />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /start voice chat/i }));
      });
      await act(async () => { MockWS.instances[0].triggerOpen(); });
      await act(async () => {
        MockWS.instances[0].triggerMessage({ type: 'response.audio.done' });
      });
      expect(onSpeakingChange).toHaveBeenCalledWith(false);
    });

    it('shows Voice error toast on error-type WS message', async () => {
      await openConnection();
      await act(async () => {
        MockWS.instances[0].triggerMessage({ type: 'error', error: { message: 'Rate limit hit' } });
      });
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Voice error', variant: 'destructive' })
      );
    });
  });

  describe('end conversation', () => {
    it('returns to idle state when End Voice Chat is clicked', async () => {
      await openConnection();
      expect(screen.getByRole('button', { name: /end voice chat/i })).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /end voice chat/i }));
      });
      expect(screen.getByRole('button', { name: /start voice chat/i })).toBeInTheDocument();
    });

    it('clears audio queue when conversation ends', async () => {
      await openConnection();
      expect(screen.getByRole('button', { name: /end voice chat/i })).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /end voice chat/i }));
      });
      expect(vi.mocked(clearAudioQueue)).toHaveBeenCalled();
    });
  });

  describe('reconnect on unexpected close', () => {
    it('schedules reconnect toast when WS closes without user action', async () => {
      await openConnection();
      await act(async () => { MockWS.instances[0].triggerClose(); });
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Retrying voice connection' })
      );
    });
  });
});
