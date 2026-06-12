import { vi } from 'vitest';

/** Minimal controllable double for the browser SpeechRecognition API. */
export class FakeSpeechRecognition extends EventTarget {
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

export interface VoiceTestWindow extends Window {
  SpeechRecognition?: new () => FakeSpeechRecognition;
  webkitSpeechRecognition?: new () => FakeSpeechRecognition;
}
