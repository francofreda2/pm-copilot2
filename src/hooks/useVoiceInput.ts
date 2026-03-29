import { useState, useRef, useCallback, useEffect } from 'react';

// ── Minimal typings for Web Speech API ──
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface ISpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): { transcript: string; confidence: number };
  [index: number]: { transcript: string; confidence: number };
}
interface ISpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: { length: number; item(i: number): ISpeechRecognitionResult; [i: number]: ISpeechRecognitionResult };
}
interface ISpeechRecognitionErrorEvent {
  readonly error: string;
}
interface ISpeechRecognitionConstructor {
  new(): ISpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionConstructor;
    webkitSpeechRecognition?: ISpeechRecognitionConstructor;
  }
}

export interface UseVoiceInputOptions {
  lang?: string;
  continuous?: boolean;
  onTranscript?: (text: string) => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

export interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  interimTranscript: string;
}

export function useVoiceInput({
  lang = 'es-AR',
  continuous = true,
  onTranscript,
  onEnd,
  onError,
}: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const intentionalStopRef = useRef(false);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SpeechRecognitionClass: ISpeechRecognitionConstructor | undefined =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;

  const isSupported = !!SpeechRecognitionClass;

  const clearRestartTimeout = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  };

  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    clearRestartTimeout();
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognitionClass) return;

    intentionalStopRef.current = false;
    clearRestartTimeout();

    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognitionClass();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript('');
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        onTranscript?.(final);
        setInterimTranscript('');
      }
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        // Auto-restart on silence instead of showing error
        if (!intentionalStopRef.current) {
          clearRestartTimeout();
          restartTimeoutRef.current = setTimeout(() => {
            if (!intentionalStopRef.current) {
              try { recognition.stop(); } catch {}
              setTimeout(() => {
                if (!intentionalStopRef.current) startListening();
              }, 100);
            }
          }, 200);
        }
        return;
      }

      if (event.error === 'aborted') return; // Ignore aborted (we handle it)

      const msg =
        event.error === 'not-allowed'
          ? 'Permiso de micrófono denegado. Habilitalo en la configuración del navegador.'
          : `Error de reconocimiento: ${event.error}`;
      onError?.(msg);
      setIsListening(false);
      setInterimTranscript('');
    };

    recognition.onend = () => {
      // Auto-restart if not intentionally stopped (handles browser auto-stop)
      if (!intentionalStopRef.current && continuous) {
        clearRestartTimeout();
        restartTimeoutRef.current = setTimeout(() => {
          if (!intentionalStopRef.current) {
            startListening();
          }
        }, 150);
        return;
      }

      setIsListening(false);
      setInterimTranscript('');
      onEnd?.();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      // Already started, ignore
    }
  }, [SpeechRecognitionClass, lang, continuous, onTranscript, onEnd, onError]);

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      clearRestartTimeout();
      recognitionRef.current?.abort();
    };
  }, []);

  return { isListening, isSupported, startListening, stopListening, interimTranscript };
}
