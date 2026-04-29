-- Fuelify — Households & Shopping Cart schema
-- Households allow multiple users to share a shopping cart.
-- Each household has one owner and zero or more members.

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE household_role AS ENUM ('owner', 'member');

-- ============================================================
-- HOUSEHOLDS
-- ============================================================

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_households_created_by ON households (created_by);

-- ============================================================
-- HOUSEHOLD MEMBERS
-- Join table: many-to-many between users and households.
-- A user can belong to multiple households; a household has many members.
-- The creator is automatically added as 'owner'.
-- ============================================================

CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role household_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (household_id, user_id)
);

CREATE INDEX idx_household_members_user ON household_members (user_id);
CREATE INDEX idx_household_members_household ON household_members (household_id);

-- ============================================================
-- SHOPPING CART ITEMS
-- Items belong to a household so all members can see/edit them.
-- Each item tracks who added it and optional recipe linkage.
-- ============================================================

CREATE TABLE shopping_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households (id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit TEXT,                              -- e.g. 'lbs', 'oz', 'cups', 'items'
  category TEXT,                          -- e.g. 'Produce', 'Dairy', 'Meat'
  recipe_id UUID REFERENCES recipes (id) ON DELETE SET NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cart_items_household ON shopping_cart_items (household_id);
CREATE INDEX idx_cart_items_added_by ON shopping_cart_items (added_by);
CREATE INDEX idx_cart_items_checked ON shopping_cart_items (household_id, checked);

-- ============================================================
-- ROW LEVEL SECURITY
-- Household data is visible to all members of that household.
-- ============================================================

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_cart_items ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is a member of a given household
CREATE OR REPLACE FUNCTION is_household_member(hh_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hh_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is the owner of a given household
CREATE OR REPLACE FUNCTION is_household_owner(hh_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hh_id AND user_id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Households: members can read, only owner can update/delete
CREATE POLICY households_select ON households
  FOR SELECT USING (is_household_member(id));
CREATE POLICY households_insert ON households
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY households_update ON households
  FOR UPDATE USING (is_household_owner(id));
CREATE POLICY households_delete ON households
  FOR DELETE USING (is_household_owner(id));

-- Household members: members can read the member list
-- Only owners can add/remove members (except self-removal)
CREATE POLICY hh_members_select ON household_members
  FOR SELECT USING (is_household_member(household_id));
CREATE POLICY hh_members_insert ON household_members
  FOR INSERT WITH CHECK (is_household_owner(household_id) OR user_id = auth.uid());
CREATE POLICY hh_members_update ON household_members
  FOR UPDATE USING (is_household_owner(household_id));
CREATE POLICY hh_members_delete ON household_members
  FOR DELETE USING (
    is_household_owner(household_id) OR user_id = auth.uid()
  );

-- Shopping cart items: any household member can CRUD
CREATE POLICY cart_items_select ON shopping_cart_items
  FOR SELECT USING (is_household_member(household_id));
CREATE POLICY cart_items_insert ON shopping_cart_items
  FOR INSERT WITH CHECK (is_household_member(household_id));
CREATE POLICY cart_items_update ON shopping_cart_items
  FOR UPDATE USING (is_household_member(household_id));
CREATE POLICY cart_items_delete ON shopping_cart_items
  FOR DELETE USING (is_household_member(household_id));

-- ============================================================
-- AUTO-ADD OWNER AS MEMBER on household creation
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_household()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO household_members (household_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_household_created
  AFTER INSERT ON households
  FOR EACH ROW EXECUTE FUNCTION handle_new_household();

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER update_households_updated_at
  BEFORE UPDATE ON households FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON shopping_cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
