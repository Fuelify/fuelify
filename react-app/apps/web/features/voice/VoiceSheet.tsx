'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useSpeechInput } from '@/lib/useSpeechInput';
import { Icon, Sheet, Spinner } from '@/components/ui';

/**
 * Dictation sheet: starts listening when opened, shows the words live, lets
 * the person fix them, and previews what will be created from them.
 */
export function VoiceSheet({
  open,
  title,
  hint,
  example,
  onClose,
  preview,
  actionLabel,
  canSubmit,
  onSubmit,
}: {
  open: boolean;
  title: string;
  /** How to speak, shown before anything is said */
  hint: string;
  /** An example of what to say */
  example?: string;
  onClose: () => void;
  /** What will be created from the words so far */
  preview: (text: string) => ReactNode;
  actionLabel: (text: string) => string;
  canSubmit: (text: string) => boolean;
  /** Resolve true to close */
  onSubmit: (text: string) => Promise<boolean> | boolean;
}) {
  const speech = useSpeechInput({ continuous: true });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  // Fresh session each time it opens
  useEffect(() => {
    if (!open) return;
    speech.reset();
    setText('');
    if (speech.supported) speech.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, speech.supported]);

  // Recognized words flow into the editable text while listening
  useEffect(() => {
    if (speech.listening || speech.transcript) setText(speech.transcript);
  }, [speech.transcript, speech.listening]);

  const close = () => {
    speech.reset();
    onClose();
  };
  const live = speech.listening ? `${text} ${speech.interim}`.trim() : text;

  return (
    <Sheet
      open={open}
      title={title}
      onClose={close}
      footer={
        <button
          className="btn btn-primary btn-block"
          disabled={busy || speech.listening || !canSubmit(text)}
          onClick={async () => {
            setBusy(true);
            const done = await onSubmit(text);
            setBusy(false);
            if (done) close();
          }}
        >
          {busy ? <Spinner /> : actionLabel(text)}
        </button>
      }
    >
      <div className="stack">
        {!speech.supported ? (
          <div className="alert alert-info">This browser can’t listen. Try Chrome or Safari, or type below.</div>
        ) : (
          <div className="center stack-sm" style={{ alignItems: 'center' }}>
            <button
              type="button"
              className={`mic-big${speech.listening ? ' mic-live' : ''}`}
              aria-label={speech.listening ? 'Stop listening' : 'Start listening'}
              aria-pressed={speech.listening}
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
            >
              <Icon name="mic" size={30} />
            </button>
            <span className="small muted">{speech.listening ? 'Listening… tap to stop' : text ? 'Tap to keep talking' : 'Tap to talk'}</span>
          </div>
        )}
        {speech.error && <div className="alert" role="alert">{speech.error}</div>}

        {speech.listening ? (
          <div className="card" aria-live="polite" style={{ minHeight: 72 }}>
            {live ? <span>{text} <span className="faint">{speech.interim}</span></span> : <span className="muted small">{hint}{example && <><br /><em>“{example}”</em></>}</span>}
          </div>
        ) : (
          <div className="field">
            <label htmlFor="voice-text">What you said</label>
            <textarea id="voice-text" className="textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)}
              placeholder={example ? `e.g. ${example}` : hint} />
            {!text && <span className="hint">{hint}</span>}
          </div>
        )}

        {text.trim() && preview(live)}
      </div>
    </Sheet>
  );
}
