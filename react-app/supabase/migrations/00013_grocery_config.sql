-- Grocery store connection settings (Premium), edited on the Profile page.
-- Shape: see readGroceryConfig in packages/shared/src/models/grocery.ts.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grocery_config JSONB NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN profiles.grocery_config IS 'Grocery store connection settings (see readGroceryConfig): zipCode, stores, strategy, maxStores, preferOrganic, preferStoreBrand, instacartRetailer';
