import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  appendTranscript,
  useSpeechRecognition,
  type UseSpeechRecognitionOptions,
} from '../../apps/omnihub-site/src/hooks/useSpeechRecognition';
import {
  FakeSpeechRecognition,
  type VoiceTestWindow,
} from './_speech-recognition-test-helpers';

const voiceWindow = window as VoiceTestWindow;

function makeOptions(): UseSpeechRecognitionOptions & {
  onTranscript: ReturnType<typeof vi.fn>;
  onUnsupported: ReturnType<typeof vi.fn>;
  onError: ReturnType<typeof vi.fn>;
} {
  return {
    onTranscript: vi.fn(),
    onUnsupported: vi.fn(),
    onError: vi.fn(),
  };
}

describe('appendTranscript', () => {
  it('returns the transcript alone when prior text is empty', () => {
    expect(appendTranscript('', 'connect salesforce')).toBe('connect salesforce');
  });

  it('returns the transcript alone when prior text is whitespace', () => {
    expect(appendTranscript('   ', 'connect stripe')).toBe('connect stripe');
  });

  it('joins prior text and transcript with a single space', () => {
    expect(appendTranscript('connect', 'salesforce')).toBe('connect salesforce');
  });

  it('trims trailing whitespace from prior text before joining', () => {
    expect(appendTranscript('connect  ', 'stripe')).toBe('connect stripe');
  });
});

describe('useSpeechRecognition', () => {
  beforeEach(() => {
    FakeSpeechRecognition.instances = [];
    voiceWindow.SpeechRecognition = FakeSpeechRecognition;
    delete voiceWindow.webkitSpeechRecognition;
  });

  afterEach(() => {
    delete voiceWindow.SpeechRecognition;
    delete voiceWindow.webkitSpeechRecognition;
    vi.clearAllMocks();
  });

  it('fires onUnsupported and stays idle when the API is absent', () => {
    delete voiceWindow.SpeechRecognition;
    const options = makeOptions();
    const { result } = renderHook(() => useSpeechRecognition(options));

    act(() => result.current.toggle());

    expect(options.onUnsupported).toHaveBeenCalledTimes(1);
    expect(result.current.isListening).toBe(false);
    expect(FakeSpeechRecognition.instances).toHaveLength(0);
  });

  it('falls back to the webkit-prefixed constructor', () => {
    delete voiceWindow.SpeechRecognition;
    voiceWindow.webkitSpeechRecognition = FakeSpeechRecognition;
    const options = makeOptions();
    const { result } = renderHook(() => useSpeechRecognition(options));

    act(() => result.current.toggle());

    expect(result.current.isListening).toBe(true);
    expect(FakeSpeechRecognition.instances).toHaveLength(1);
  });

  it('starts a configured recognition session on toggle', () => {
    const options = makeOptions();
    const { result } = renderHook(() => useSpeechRecognition(options));

    act(() => result.current.toggle());

    expect(result.current.isListening).toBe(true);
    const recognition = FakeSpeechRecognition.instances[0];
    expect(recognition.start).toHaveBeenCalledTimes(1);
    expect(recognition.continuous).toBe(false);
    expect(recognition.interimResults).toBe(false);
    expect(recognition.lang).toBe('en-US');
  });

  it('delivers only final, non-empty transcripts to onTranscript', () => {
    const options = makeOptions();
    const { result } = renderHook(() => useSpeechRecognition(options));
    act(() => result.current.toggle());
    const recognition = FakeSpeechRecognition.instances[0];

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          { isFinal: true, 0: { transcript: ' connect salesforce ' } },
          { isFinal: false, 0: { transcript: 'interim noise' } },
          { isFinal: true, 0: { transcript: 'to omnihub' } },
        ],
      });
    });

    expect(options.onTranscript).toHaveBeenCalledTimes(1);
    expect(options.onTranscript).toHaveBeenCalledWith('connect salesforce to omnihub');
  });

  it('ignores result events that contain no final transcript text', () => {
    const options = makeOptions();
    const { result } = renderHook(() => useSpeechRecognition(options));
    act(() => result.current.toggle());
    const recognition = FakeSpeechRecognition.instances[0];

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          { isFinal: false, 0: { transcript: 'interim only' } },
          { isFinal: true, 0: { transcript: '   ' } },
        ],
      });
    });

    expect(options.onTranscript).not.toHaveBeenCalled();
  });

  it('stops the active session when toggled twice', () => {
    const options = makeOptions();
    const { result } = renderHook(() => useSpeechRecognition(options));

    act(() => result.current.toggle());
    const recognition = FakeSpeechRecognition.instances[0];
    act(() => result.current.toggle());

    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(result.current.isListening).toBe(false);
    // A third toggle starts a fresh session rather than reusing the old one.
    act(() => result.current.toggle());
    expect(FakeSpeechRecognition.instances).toHaveLength(2);
  });

  it('fires onError and resets listening state on recognition error', () => {
    const options = makeOptions();
    const { result } = renderHook(() => useSpeechRecognition(options));
    act(() => result.current.toggle());
    const recognition = FakeSpeechRecognition.instances[0];

    act(() => recognition.onerror?.(new Event('error')));

    expect(options.onError).toHaveBeenCalledTimes(1);
    expect(result.current.isListening).toBe(false);
  });

  it('resets listening state when the session ends naturally', () => {
    const options = makeOptions();
    const { result } = renderHook(() => useSpeechRecognition(options));
    act(() => result.current.toggle());
    const recognition = FakeSpeechRecognition.instances[0];

    act(() => recognition.onend?.());

    expect(result.current.isListening).toBe(false);
    expect(options.onError).not.toHaveBeenCalled();
  });

  it('stop() is a safe no-op when no session is active', () => {
    const options = makeOptions();
    const { result } = renderHook(() => useSpeechRecognition(options));

    act(() => result.current.stop());

    expect(result.current.isListening).toBe(false);
    expect(FakeSpeechRecognition.instances).toHaveLength(0);
  });

  it('stops the active session on unmount', () => {
    const options = makeOptions();
    const { result, unmount } = renderHook(() => useSpeechRecognition(options));
    act(() => result.current.toggle());
    const recognition = FakeSpeechRecognition.instances[0];

    unmount();

    expect(recognition.stop).toHaveBeenCalledTimes(1);
  });

  it('uses the latest callbacks without restarting the session', () => {
    const first = makeOptions();
    const second = makeOptions();
    const { result, rerender } = renderHook(
      (options: UseSpeechRecognitionOptions) => useSpeechRecognition(options),
      { initialProps: first },
    );
    act(() => result.current.toggle());
    const recognition = FakeSpeechRecognition.instances[0];

    rerender(second);
    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'latest callback wins' } }],
      });
    });

    expect(first.onTranscript).not.toHaveBeenCalled();
    expect(second.onTranscript).toHaveBeenCalledWith('latest callback wins');
    expect(FakeSpeechRecognition.instances).toHaveLength(1);
  });
});
