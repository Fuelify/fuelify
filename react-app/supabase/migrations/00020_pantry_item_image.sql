-- Pantry items keep the product photo and barcode they were scanned with
ALTER TABLE pantry_items
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT;
