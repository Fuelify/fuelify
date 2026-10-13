'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isValidGtin } from '@fuelify/shared';
import { Icon, Sheet } from '@/components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
}

// Product barcodes only: other formats (shipping labels, QR) just cause bad lookups
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
/** How often to try decoding a frame. Every frame overheats phones and doesn't read any better. */
const SCAN_INTERVAL_MS = 120;
/** Same code this many times in a row before we trust it (single reads can be off by a digit) */
const CONFIRM_READS = 2;

/** A product code we can trust: digits only with a correct check digit (UPC-E is 8 digits starting 0/1). */
function plausible(code: string): boolean {
  const c = code.trim();
  if (!/^\d{8,14}$/.test(c)) return false;
  return isValidGtin(c) || (c.length === 8 && /^[01]/.test(c));
}

// Minimal native BarcodeDetector shape (TS lib may not include it)
interface NativeBarcodeDetector {
  detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
}

export function BarcodeScannerSheet({ open, onClose, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<unknown>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef(false);
  const lastReadRef = useRef<{ code: string; count: number }>({ code: '', count: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [torch, setTorch] = useState<'unsupported' | 'off' | 'on'>('unsupported');

  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const emit = useCallback(
    (code: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      navigator.vibrate?.(40);
      onScanned(code.trim());
    },
    [onScanned],
  );

  /** A camera read: accept only after the same valid code is seen twice in a row. */
  const onRead = useCallback(
    (raw: string) => {
      const code = raw.trim();
      if (!plausible(code)) return;
      const last = lastReadRef.current;
      lastReadRef.current = last.code === code ? { code, count: last.count + 1 } : { code, count: 1 };
      if (lastReadRef.current.count >= CONFIRM_READS) emit(code);
    },
    [emit],
  );

  const stopAll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (zxingReaderRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = zxingReaderRef.current as any;
      try { reader.reset?.(); } catch { /* noop */ }
      zxingReaderRef.current = null;
    }
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    scannedRef.current = false;
    lastReadRef.current = { code: '', count: 0 };
    setError(null);
    setTorch('unsupported');

    let cancelled = false;

    async function start() {
      try {
        // A sharper feed reads small barcodes far better than the default 640x480
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        // Keep focusing as the phone moves, and offer the flashlight if there is one
        const track = stream.getVideoTracks()[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const caps = (track?.getCapabilities?.() ?? {}) as any;
        if (caps.focusMode?.includes?.('continuous')) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] }).catch(() => {});
        }
        if (caps.torch) setTorch('off');
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        // Prefer native BarcodeDetector
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const BD = (window as any).BarcodeDetector;
        if (BD) {
          const detector: NativeBarcodeDetector = new BD({ formats: FORMATS });
          const loop = async () => {
            if (scannedRef.current || cancelled) return;
            try {
              const codes = await detector.detect(video);
              for (const c of codes ?? []) onRead(c.rawValue);
            } catch {
              /* frame decode failed; ignore and retry */
            }
            if (!scannedRef.current && !cancelled) timerRef.current = setTimeout(loop, SCAN_INTERVAL_MS);
          };
          loop();
          return;
        }

        // Fallback: @zxing/library
        setUsingFallback(true);
        const zxing = await import('@zxing/library');
        const hints = new Map();
        hints.set(zxing.DecodeHintType.POSSIBLE_FORMATS, [zxing.BarcodeFormat.EAN_13, zxing.BarcodeFormat.EAN_8, zxing.BarcodeFormat.UPC_A, zxing.BarcodeFormat.UPC_E]);
        const reader = new zxing.BrowserMultiFormatReader(hints, SCAN_INTERVAL_MS * 2);
        zxingReaderRef.current = reader;
        await reader.decodeFromStream(stream, video, (result) => {
          if (result && !scannedRef.current) onRead(result.getText());
        });
      } catch (e) {
        setError(
          (e as Error).message ||
            'Could not access the camera. You can enter the barcode manually below.',
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [open, onRead, stopAll]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = torch !== 'on';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await track.applyConstraints({ advanced: [{ torch: next } as any] }).then(() => setTorch(next ? 'on' : 'off')).catch(() => setTorch('unsupported'));
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manual.trim();
    if (!code) return;
    setManual('');
    emit(code);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Scan barcode">
      <div className="stack">
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 'var(--radius)', overflow: 'hidden', background: '#000' }}>
          <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
          <div style={{ position: 'absolute', inset: '30% 8%', border: '3px solid var(--primary)', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
          {torch !== 'unsupported' && (
            <button type="button" className="icon-btn" onClick={toggleTorch} aria-label={torch === 'on' ? 'Turn off flashlight' : 'Turn on flashlight'} aria-pressed={torch === 'on'}
              style={{ position: 'absolute', right: 10, bottom: 10, background: torch === 'on' ? '#fff' : 'rgba(0,0,0,0.5)', color: torch === 'on' ? '#000' : '#fff' }}>
              <Icon name="lightbulb" size={20} />
            </button>
          )}
        </div>
        <p className="small muted center">Hold the barcode flat inside the box, about a hand’s width away.</p>

        {usingFallback && <p className="tiny faint center">Using fallback decoder (@zxing).</p>}
        {error && <div className="alert">{error}</div>}

        <form className="row" onSubmit={submitManual}>
          <input
            className="input"
            placeholder="Or type a barcode"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
            aria-label="Barcode"
          />
          <button className="btn btn-primary" type="submit" disabled={!manual.trim()}>
            <Icon name="search" /> Look up
          </button>
        </form>
      </div>
    </Sheet>
  );
}
