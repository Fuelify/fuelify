'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
        reader.decodeFromVideoElement(video, (result) => {
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

  if (!open) return null;

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manual.trim();
    if (!code) return;
    setManual('');
    emit(code);
  };

  return (
    <div style={s.backdrop} onClick={onClose}>
      <div style={s.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <h3 style={s.title}>Scan Barcode</h3>
          <button style={s.close} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={s.videoWrap}>
          <video ref={videoRef} style={s.video} muted playsInline />
          <div style={s.frame} />
        </div>

        {usingFallback && <p style={s.note}>Using fallback decoder (@zxing).</p>}
        {error && <p style={s.error}>{error}</p>}

        <form style={s.manualForm} onSubmit={submitManual}>
          <input
            style={s.input}
            placeholder="Or enter barcode (e.g. 5449000000996)"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="numeric"
          />
          <button style={s.btnPrimary} type="submit" disabled={!manual.trim()}>
            Look up
          </button>
        </form>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  dialog: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    width: '100%',
    maxWidth: 500,
    padding: 16,
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { color: '#FFBD73', margin: 0, fontSize: 18 },
  close: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: 18,
    cursor: 'pointer',
  },
  videoWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 3',
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  video: { width: '100%', height: '100%', objectFit: 'cover' },
  frame: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    bottom: '20%',
    border: '2px solid #FFBD73',
    borderRadius: 8,
    pointerEvents: 'none',
  },
  note: { color: '#aaa', fontSize: 12, margin: '8px 0 0 0' },
  error: { color: '#ff6b6b', fontSize: 13, margin: '8px 0 0 0' },
  manualForm: { display: 'flex', gap: 8, marginTop: 12 },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: '#FFBD73',
    color: '#202020',
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
