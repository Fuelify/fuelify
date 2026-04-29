-- Fuelify — Pantry schema
-- Pantry items are scoped to a household so all members share visibility.
-- Supports dry/cool/frozen storage zones and partial-open tracking.

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE storage_zone AS ENUM ('dry', 'cool', 'frozen');
CREATE TYPE item_status  AS ENUM ('sealed', 'open', 'expired');

-- ============================================================
-- PANTRY ITEMS
-- Each row is a specific instance of an item (e.g. one bag of rice).
-- Multiple rows with the same name are aggregated in the UI.
-- ============================================================

CREATE TABLE pantry_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households (id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,

  -- Identity
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,                              -- e.g. 'Grains', 'Dairy', 'Vegetables'

  -- Storage
  storage_zone storage_zone NOT NULL DEFAULT 'dry',

  -- Quantity
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit TEXT,                                  -- e.g. 'lbs', 'oz', 'items', 'bags'
  remaining_pct INTEGER NOT NULL DEFAULT 100  -- 0-100, tracks partially open items
    CHECK (remaining_pct BETWEEN 0 AND 100),

  -- Status
  status item_status NOT NULL DEFAULT 'sealed',

  -- Dates
  purchase_date DATE,
  expiration_date DATE,

  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pantry_household ON pantry_items (household_id);
CREATE INDEX idx_pantry_zone ON pantry_items (household_id, storage_zone);
CREATE INDEX idx_pantry_name ON pantry_items (household_id, name);
CREATE INDEX idx_pantry_expiration ON pantry_items (household_id, expiration_date)
  WHERE expiration_date IS NOT NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- Same pattern as shopping cart: household members can CRUD.
-- ============================================================

ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY pantry_items_select ON pantry_items
  FOR SELECT USING (is_household_member(household_id));
CREATE POLICY pantry_items_insert ON pantry_items
  FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY pantry_items_update ON pantry_items
  FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY pantry_items_delete ON pantry_items
  FOR DELETE USING (is_household_member(household_id));

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE TRIGGER update_pantry_items_updated_at
  BEFORE UPDATE ON pantry_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
