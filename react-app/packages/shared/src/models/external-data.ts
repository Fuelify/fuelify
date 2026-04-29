// External data from barcode lookup and receipt OCR services.

import type { StorageZone, ItemStatus } from './pantry';

/** Normalized product info from barcode lookup (e.g. Open Food Facts). */
export interface ProductInfo {
  barcode: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  quantity?: number;
  unit?: string;
}

/** A single line item parsed from a receipt image. */
export interface ReceiptLineItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  suggestedCategory?: string;
}

/** Aggregate result from receipt OCR. */
export interface ReceiptParseResult {
  merchantName?: string;
  date?: string;
  total?: number;
  lineItems: ReceiptLineItem[];
}

/**
 * Input shape for adding a pantry item.
 * Shared between the repo, store, and UI (manual add / barcode pre-fill / receipt bulk-import).
 */
export interface PantryItemDraft {
  name: string;
  brand?: string;
  category?: string;
  storageZone?: StorageZone;
  quantity?: number;
  unit?: string;
  remainingPct?: number;
  status?: ItemStatus;
  purchaseDate?: string;
  expirationDate?: string;
  notes?: string;
}
