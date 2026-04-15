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

  if (!open) return null;

  const selectedCount = lines.filter((l) => l.selected).length;

  return (
    <div style={s.backdrop} onClick={handleClose}>
      <div style={s.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={s.header}>
          <h3 style={s.title}>Import Receipt</h3>
          <button style={s.close} onClick={handleClose} aria-label="Close">
            ✕
          </button>
        </div>

        {loading ? (
          <p style={s.status}>Parsing receipt…</p>
        ) : error ? (
          <div>
            <p style={s.error}>{error}</p>
            <button style={s.btnSecondary} onClick={() => setError(null)}>
              Try again
            </button>
          </div>
        ) : !result ? (
          <div style={s.uploadWrap}>
            <p style={s.hint}>
              Upload a photo of your grocery receipt. We&apos;ll extract the line items so you can
              bulk-add them to the pantry.
            </p>
            <label style={s.uploadLabel}>
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
              Choose receipt image
            </label>
          </div>
        ) : (
          <>
            {result.merchantName && <p style={s.merchant}>{result.merchantName}</p>}
            <p style={s.subtitle}>
              {selectedCount} of {lines.length} selected
            </p>
            <div style={s.listWrap}>
              {lines.length === 0 ? (
                <p style={s.hint}>No line items detected.</p>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th />
                      <th style={s.th}>Name</th>
                      <th style={s.th}>Qty</th>
                      <th style={s.th}>Zone</th>
                      <th style={s.th}>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={i}>
                        <td style={s.td}>
                          <input
                            type="checkbox"
                            checked={line.selected}
                            onChange={(e) => updateLine(i, { selected: e.target.checked })}
                          />
                        </td>
                        <td style={s.td}>
                          <input
                            style={s.cellInput}
                            value={line.name}
                            onChange={(e) => updateLine(i, { name: e.target.value })}
                          />
                        </td>
                        <td style={s.td}>
                          <input
                            style={{ ...s.cellInput, width: 54 }}
                            type="number"
                            min={0}
                            step={0.5}
                            value={line.quantity ?? 1}
                            onChange={(e) =>
                              updateLine(i, { quantity: parseFloat(e.target.value) || 1 })
                            }
                          />
                        </td>
                        <td style={s.td}>
                          <select
                            style={s.cellInput}
                            value={line.storageZone ?? 'dry'}
                            onChange={(e) =>
                              updateLine(i, { storageZone: e.target.value as StorageZone })
                            }
                          >
                            {STORAGE_ZONES.map((z) => (
                              <option key={z} value={z}>
                                {STORAGE_ZONE_LABELS[z]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={s.td}>
                          <select
                            style={s.cellInput}
                            value={line.category ?? ''}
                            onChange={(e) =>
                              updateLine(i, { category: e.target.value || undefined })
                            }
                          >
                            <option value="">—</option>
                            {PANTRY_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={s.footer}>
              <button style={s.btnSecondary} onClick={() => setResult(null)} disabled={submitting}>
                Start over
              </button>
              <button
                style={{ ...s.btnPrimary, ...(submitting ? { opacity: 0.5 } : {}) }}
                onClick={handleImport}
                disabled={submitting || selectedCount === 0}
              >
                {submitting ? 'Adding…' : `Add ${selectedCount}`}
              </button>
            </div>
          </>
        )}
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
    maxWidth: 800,
    maxHeight: '90vh',
    padding: 16,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
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
  uploadWrap: { padding: 24, textAlign: 'center' },
  uploadLabel: {
    display: 'inline-block',
    backgroundColor: '#FFBD73',
    color: '#202020',
    padding: '10px 20px',
    borderRadius: 8,
    fontWeight: 600,
    cursor: 'pointer',
  },
  hint: { color: '#ccc', fontSize: 14, marginBottom: 16 },
  merchant: { color: '#fff', margin: '4px 0', fontWeight: 600 },
  subtitle: { color: '#aaa', fontSize: 12, margin: '0 0 8px 0' },
  listWrap: { overflow: 'auto', flex: 1, borderTop: '1px solid #333', paddingTop: 8 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { color: '#aaa', padding: 6, textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #333' },
  td: { padding: 6, borderBottom: '1px solid #333' },
  cellInput: {
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: 6,
    padding: 6,
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
  },
  status: { color: '#ccc', padding: 24, textAlign: 'center' },
  error: { color: '#ff6b6b', padding: 8 },
  footer: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' },
  btnPrimary: {
    backgroundColor: '#FFBD73',
    color: '#202020',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnSecondary: {
    backgroundColor: '#444',
    color: '#ccc',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
