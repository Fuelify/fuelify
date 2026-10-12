'use client';

import { useState } from 'react';
import { parseSpokenItems, type SpokenItem } from '@fuelify/shared';
import { Icon } from '@/components/ui';
import { VoiceSheet } from './VoiceSheet';

const amount = (i: SpokenItem) => (i.unit ? `${i.quantity} ${i.unit}` : i.quantity !== 1 ? `×${i.quantity}` : '');

/** Say several items with amounts; they're split, previewed and added in one go. */
export function VoiceItemsSheet({
  open,
  onClose,
  onAdd,
  title = 'Say your items',
  destination = 'list',
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (items: SpokenItem[]) => Promise<void>;
  title?: string;
  destination?: string;
}) {
  // Items the person removed from the preview (by name)
  const [dropped, setDropped] = useState<string[]>([]);
  const items = (text: string) => parseSpokenItems(text).filter((i) => !dropped.includes(i.name));

  return (
    <VoiceSheet
      open={open}
      title={title}
      hint="Say each item with how much you need. Pause or say “and” between items."
      example="two pounds of ground beef, a dozen eggs and a gallon of milk"
      onClose={() => {
        setDropped([]);
        onClose();
      }}
      preview={(text) => {
        const found = items(text);
        if (found.length === 0) return <p className="hint">No items yet.</p>;
        return (
          <div className="list">
            {found.map((i) => (
              <div key={`${i.name}-${i.unit}`} className="list-row" style={{ gap: 10 }}>
                <span className="grow" style={{ fontWeight: 600, textTransform: 'capitalize' }}>{i.name}</span>
                <span className="small muted">{amount(i)}</span>
                <button type="button" className="icon-btn" aria-label={`Remove ${i.name}`} onClick={() => setDropped((d) => [...d, i.name])}>
                  <Icon name="x" size={18} />
                </button>
              </div>
            ))}
          </div>
        );
      }}
      canSubmit={(text) => items(text).length > 0}
      actionLabel={(text) => {
        const n = items(text).length;
        return n ? `Add ${n} item${n === 1 ? '' : 's'} to ${destination}` : 'Add items';
      }}
      onSubmit={async (text) => {
        await onAdd(items(text));
        setDropped([]);
        return true;
      }}
    />
  );
}
