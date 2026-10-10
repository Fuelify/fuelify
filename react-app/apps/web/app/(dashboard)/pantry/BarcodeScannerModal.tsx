'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, Sheet } from '../../components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];

// Minimal native BarcodeDetector shape (TS lib may not include it)
interface NativeBarcodeDetector {
  detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
}

export function BarcodeScannerModal({ open, onClose, onScanned }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<unknown>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef(false);

  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const emit = useCallback(
    (code: string) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      onScanned(code.trim());
    },
    [onScanned],
  );

  const stopAll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
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
    setError(null);

    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
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
              if (codes && codes.length > 0) {
                emit(codes[0].rawValue);
                return;
              }
            } catch {
              /* frame decode failed; ignore and retry */
            }
            rafRef.current = requestAnimationFrame(loop);
          };
          loop();
          return;
        }

        // Fallback: @zxing/library
        setUsingFallback(true);
        const zxing = await import('@zxing/library');
        const reader = new zxing.BrowserMultiFormatReader();
        zxingReaderRef.current = reader;
        await reader.decodeFromStream(stream, video, (result) => {
          if (result && !scannedRef.current) emit(result.getText());
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
  }, [open, emit, stopAll]);

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
          <div style={{ position: 'absolute', inset: '22% 12%', border: '3px solid var(--primary)', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
        </div>
        <p className="small muted center">Point your camera at a product barcode.</p>

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
