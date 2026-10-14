'use client';

// Sends a receipt photo to /api/receipts/parse (read by Claude on our server).

import type { TypedSupabaseClient } from '@fuelify/shared';
import type { ReceiptReading } from '@/app/api/receipts/parse/route';
import { fitJpeg } from './image';

export type { ReceiptReading };
export type ReceiptReadingItem = ReceiptReading['items'][number];

export class ReceiptReaderUnavailable extends Error {}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]+,/, ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export async function readReceipt(supabase: TypedSupabaseClient, photo: File): Promise<ReceiptReading> {
  // Receipts are long and thin: keep enough height for the small print
  const image = await toBase64(await fitJpeg(photo, 2200, 0.82));
  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/receipts/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify({ image, mediaType: 'image/jpeg' }),
  }).catch(() => null);
  if (!res) throw new Error('Couldn’t reach Fuelify. Check your connection.');
  const body = await res.json().catch(() => ({}));
  if (body.notConfigured) throw new ReceiptReaderUnavailable(body.error);
  if (!res.ok) throw new Error(body.error ?? 'Couldn’t read that receipt.');
  return body as ReceiptReading;
}
