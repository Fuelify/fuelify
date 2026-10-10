'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  ReceiptParser,
  mapLineItemToPantryDraft,
  STORAGE_ZONES,
  STORAGE_ZONE_LABELS,
  PANTRY_CATEGORIES,
  type PantryItemDraft,
  type ReceiptParseResult,
  type StorageZone,
} from '@fuelify/shared';
import { useSupabase } from '../../providers';
import { Icon, Sheet, Spinner } from '../../components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (drafts: PantryItemDraft[]) => Promise<void>;
}

interface EditableLine extends PantryItemDraft {
  selected: boolean;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip data URL prefix
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ReceiptImportModal({ open, onClose, onImport }: Props) {
  const supabase = useSupabase();
  const parser = useMemo(() => new ReceiptParser(supabase), [supabase]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptParseResult | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setLoading(false);
    setError(null);
    setResult(null);
    setLines([]);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = useCallback(
    async (file: File) => {
      reset();
      setLoading(true);
      try {
        const b64 = await fileToBase64(file);
        const parsed = await parser.parse(b64);
        setResult(parsed);
        setLines(
          parsed.lineItems.map((l) => ({ ...mapLineItemToPantryDraft(l), selected: true })),
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [parser],
  );

  const updateLine = (i: number, patch: Partial<EditableLine>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const handleImport = async () => {
    const drafts = lines.filter((l) => l.selected && l.name.trim()).map(({ selected: _s, ...d }) => d);
    if (drafts.length === 0) return;
    setSubmitting(true);
    try {
      await onImport(drafts);
      handleClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = lines.filter((l) => l.selected).length;

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Import receipt"
      footer={
        result && lines.length > 0 ? (
          <>
            <button className="btn btn-secondary" onClick={() => setResult(null)} disabled={submitting}>Start over</button>
            <button className="btn btn-primary grow" onClick={handleImport} disabled={submitting || selectedCount === 0}>
              {submitting ? 'Adding…' : `Add ${selectedCount} to pantry`}
            </button>
          </>
        ) : undefined
      }
    >
      {loading ? (
        <div className="center-fill" style={{ minHeight: 200 }}>
          <Spinner />
          <p className="muted">Reading your receipt…</p>
        </div>
      ) : error ? (
        <div className="stack">
          <div className="alert">{error}</div>
          <button className="btn btn-secondary" onClick={() => setError(null)}>Try again</button>
        </div>
      ) : !result ? (
        <div className="stack">
          <p className="muted">
            Upload a photo of your grocery receipt. We&apos;ll pull out the line items so you can add them to your pantry in one go.
          </p>
          <label className="card card-button center-fill" style={{ minHeight: 160, borderStyle: 'dashed', cursor: 'pointer' }}>
            <input
              style={{ display: 'none' }}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
            <span style={{ color: 'var(--primary)' }}><Icon name="camera" size={32} /></span>
            <span style={{ fontWeight: 700 }}>Take or choose a photo</span>
            <span className="tiny faint">JPG or PNG</span>
          </label>
        </div>
      ) : (
        <div className="stack">
          <div className="row-between">
            <span style={{ fontWeight: 700 }}>{result.merchantName ?? 'Receipt'}</span>
            <span className="small muted">{selectedCount} of {lines.length} selected</span>
          </div>
          {lines.length === 0 ? (
            <p className="muted">No line items detected. Try a clearer photo.</p>
          ) : (
            lines.map((line, i) => (
              <div key={i} className="card stack-sm" style={{ opacity: line.selected ? 1 : 0.5 }}>
                <div className="row">
                  <input
                    type="checkbox"
                    aria-label={`Include ${line.name}`}
                    checked={line.selected}
                    onChange={(e) => updateLine(i, { selected: e.target.checked })}
                    style={{ width: 20, height: 20, accentColor: 'var(--primary)' }}
                  />
                  <input className="input" style={{ height: 40 }} value={line.name} aria-label="Name"
                    onChange={(e) => updateLine(i, { name: e.target.value })} />
                  <input className="input" style={{ height: 40, width: 72, flexShrink: 0 }} type="number" min={0} step={0.5} aria-label="Quantity"
                    value={line.quantity ?? 1} onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 1 })} />
                </div>
                <div className="row">
                  <select className="select" style={{ height: 38, fontSize: 14 }} aria-label="Storage" value={line.storageZone ?? 'dry'}
                    onChange={(e) => updateLine(i, { storageZone: e.target.value as StorageZone })}>
                    {STORAGE_ZONES.map((z) => <option key={z} value={z}>{STORAGE_ZONE_LABELS[z]}</option>)}
                  </select>
                  <select className="select" style={{ height: 38, fontSize: 14 }} aria-label="Category" value={line.category ?? ''}
                    onChange={(e) => updateLine(i, { category: e.target.value || undefined })}>
                    <option value="">No category</option>
                    {PANTRY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Sheet>
  );
}
