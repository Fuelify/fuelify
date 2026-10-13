-- Products identified by barcode, shared by all users: filled from the
-- lookup sources (Open Food Facts, Walmart, Kroger) and from what people type
-- in when a barcode isn't found anywhere, so the next scan of the same code
-- just works. Keyed by the 13-digit EAN form (see services/gtin.ts).
CREATE TABLE IF NOT EXISTS barcode_products (
  barcode TEXT PRIMARY KEY CHECK (barcode ~ '^[0-9]{13}$'),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 200),
  brand TEXT,
  category TEXT,
  image_url TEXT,
  quantity NUMERIC,
  unit TEXT,
  -- off | walmart | kroger | user
  source TEXT NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE barcode_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY barcode_products_read ON barcode_products FOR SELECT TO authenticated USING (true);
-- Signed-in users can add products nobody has identified yet (user source only;
-- lookups from stores are written by the server)
CREATE POLICY barcode_products_add ON barcode_products FOR INSERT TO authenticated
  WITH CHECK (source = 'user' AND added_by = auth.uid());
CREATE TRIGGER update_barcode_products_updated_at
  BEFORE UPDATE ON barcode_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
