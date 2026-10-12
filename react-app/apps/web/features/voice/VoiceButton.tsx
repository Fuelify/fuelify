'use client';

import { spokenQuery } from '@fuelify/shared';
import { useSpeechInput } from '@/lib/useSpeechInput';
import { Icon } from '@/components/ui';

/**
 * Mic button for a search or text field: listens for one phrase and hands
 * back the words ("search for chicken tacos" → "chicken tacos"). Renders
 * nothing where the browser can't do speech recognition.
 */
export function VoiceButton({
  onText,
  label = 'Search by voice',
  raw = false,
  size = 18,
  className = 'btn btn-secondary',
}: {
  onText: (text: string) => void;
  label?: string;
  /** Pass the words through as heard (not as a search query) */
  raw?: boolean;
  size?: number;
  className?: string;
}) {
  const speech = useSpeechInput({ onFinal: (t) => onText(raw ? t : spokenQuery(t)) });
  if (!speech.supported) return null;
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <button
        type="button"
        className={`${className}${speech.listening ? ' mic-live' : ''}`}
        aria-label={speech.listening ? 'Stop listening' : label}
        aria-pressed={speech.listening}
        title={speech.error ?? label}
        onClick={() => (speech.listening ? speech.stop() : speech.start())}
        style={{ padding: '0 12px' }}
      >
        <Icon name="mic" size={size} />
      </button>
      {speech.error && (
        <span role="alert" className="tiny voice-error">{speech.error}</span>
      )}
    </span>
  );
}
