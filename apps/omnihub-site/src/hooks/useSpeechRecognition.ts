/**
 * useSpeechRecognition — shared Web Speech Recognition hook.
 *
 * Single source of truth for browser voice capture across the SkillForge
 * full-page wizard (src/pages/Launch/SkillForge.tsx) and the OmniBoard
 * client-facing modal (dashboard/components/OmniBoardWizard.tsx).
 *
 * Chrome/Edge only — callers receive onUnsupported when the API is absent.
 * Recognition stops automatically on unmount; callers may also stop()
 * explicitly (step change, submit, dismiss).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionEventResult {
  isFinal: boolean;
  0: {
    transcript: string;
  };
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionEventResult>;
}

export interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

interface VoiceWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

/** Append a captured transcript to prior field text with a single space. */
export function appendTranscript(prior: string, transcript: string): string {
  const trimmed = prior.trim();
  return trimmed.length > 0 ? `${trimmed} ${transcript}` : transcript;
}

export interface UseSpeechRecognitionOptions {
  /** Receives each final, non-empty transcript chunk. */
  onTranscript: (transcript: string) => void;
  /** Fired when the browser has no SpeechRecognition implementation. */
  onUnsupported: () => void;
  /** Fired when an in-flight recognition session errors. */
  onError: () => void;
}

export interface UseSpeechRecognitionResult {
  isListening: boolean;
  /** Start listening, or stop if already listening. */
  toggle: () => void;
  /** Stop listening unconditionally (no-op when idle). */
  stop: () => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions,
): UseSpeechRecognitionResult {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Keep latest callbacks without re-binding recognition handlers each render.
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    const voiceWindow = globalThis.window as VoiceWindow;
    const SpeechRecognitionAPI =
      voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      optionsRef.current.onUnsupported();
      return;
    }

    if (recognitionRef.current) {
      stop();
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const captured: string[] = [];
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          captured.push(result[0].transcript.trim());
        }
      }
      const transcript = captured.join(' ').trim();
      if (transcript.length > 0) {
        optionsRef.current.onTranscript(transcript);
      }
    };

    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
      optionsRef.current.onError();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [stop]);

  // Stop recognition cleanly on unmount.
  useEffect(() => stop, [stop]);

  return { isListening, toggle, stop };
}
