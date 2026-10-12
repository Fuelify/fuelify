'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Speech-to-text with the browser's built-in recognizer (Chrome, Edge, Safari
// incl. iPhone; not Firefox). Audio is handled by the browser/OS; nothing is
// sent to our servers. Callers hide the mic when `supported` is false.

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone access is off. Allow it for this site in your browser settings, then try again.',
  'service-not-allowed': 'Speech recognition isn’t allowed in this browser. Try Chrome or Safari.',
  'audio-capture': 'No microphone found.',
  network: 'Speech recognition needs an internet connection.',
  'no-speech': 'Didn’t catch anything. Tap the mic and try again.',
};

export interface SpeechInput {
  supported: boolean;
  listening: boolean;
  /** Everything recognized so far (final words) */
  transcript: string;
  /** Words still being recognized */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * `continuous`: keep listening through pauses until stop() (dictating a list or
 * recipe). Otherwise it stops after one phrase and calls `onFinal` (search).
 */
export function useSpeechInput({ continuous = false, onFinal }: { continuous?: boolean; onFinal?: (text: string) => void } = {}): SpeechInput {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const finalText = useRef('');
  const wanted = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  // Checked after mount so server and client render the same
  useEffect(() => setSupported(!!recognitionCtor()), []);

  const begin = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = navigator.language || 'en-US';
    r.continuous = continuous;
    r.interimResults = true;
    r.onresult = (e) => {
      let pending = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current = `${finalText.current} ${res[0].transcript}`.replace(/\s+/g, ' ').trim();
        else pending += res[0].transcript;
      }
      setTranscript(finalText.current);
      setInterim(pending.trim());
    };
    r.onerror = (e) => {
      if (e.error === 'aborted') return;
      // Silence in continuous mode just ends a segment; keep going
      if (e.error === 'no-speech' && continuous && finalText.current) return;
      wanted.current = false;
      setError(ERRORS[e.error] ?? 'Speech recognition stopped. Try again.');
    };
    r.onend = () => {
      // Browsers end continuous sessions after a pause; resume until stop()
      if (continuous && wanted.current) {
        try {
          r.start();
          return;
        } catch {
          // fall through to stopped
        }
      }
      wanted.current = false;
      rec.current = null;
      setListening(false);
      setInterim('');
      if (!continuous && finalText.current) onFinalRef.current?.(finalText.current);
    };
    rec.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      setError('Couldn’t start the microphone.');
    }
  }, [continuous]);

  const start = useCallback(() => {
    if (rec.current) return;
    setError(null);
    if (!continuous) {
      finalText.current = '';
      setTranscript('');
    }
    wanted.current = true;
    begin();
  }, [begin, continuous]);

  const stop = useCallback(() => {
    wanted.current = false;
    rec.current?.stop();
  }, []);

  const reset = useCallback(() => {
    wanted.current = false;
    rec.current?.abort();
    rec.current = null;
    finalText.current = '';
    setTranscript('');
    setInterim('');
    setError(null);
    setListening(false);
  }, []);

  useEffect(() => () => {
    wanted.current = false;
    rec.current?.abort();
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}
