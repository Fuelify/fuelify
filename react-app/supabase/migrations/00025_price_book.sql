-- Price book: prices people actually paid (from receipts, or logged by hand),
-- per store and region. A household sees its own rows; everyone else's show
-- up only as community medians, and only once two or more households have
-- reported the same item at the same store.

CREATE TABLE IF NOT EXISTS price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  store_key TEXT NOT NULL CHECK (store_key ~ '^[a-z0-9-]{1,60}$'),
  store_name TEXT NOT NULL CHECK (char_length(store_name) BETWEEN 1 AND 80),
  -- First three digits of the ZIP code (never the full ZIP)
  region TEXT CHECK (region ~ '^\d{3}$'),
  item_key TEXT NOT NULL CHECK (char_length(item_key) BETWEEN 1 AND 120),
  item_name TEXT NOT NULL CHECK (char_length(item_name) BETWEEN 1 AND 120),
  -- What the receipt or label said, e.g. "TJ ORG BANANAS"
  product_name TEXT CHECK (char_length(product_name) <= 160),
  -- Price for one unit as bought
  price NUMERIC(10, 2) NOT NULL CHECK (price > 0 AND price < 1000),
  quantity NUMERIC(10, 3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  size TEXT CHECK (char_length(size) <= 40),
  observed_on DATE NOT NULL DEFAULT current_date,
  source TEXT NOT NULL CHECK (source IN ('receipt', 'manual')),
  receipt_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_observations_item_idx ON price_observations (item_key, store_key, region, observed_on DESC);
CREATE INDEX IF NOT EXISTS price_observations_household_idx ON price_observations (household_id, observed_on DESC);

ALTER TABLE price_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_observations_read ON price_observations FOR SELECT
  USING (is_household_member(household_id));
CREATE POLICY price_observations_insert ON price_observations FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_household_member(household_id));
CREATE POLICY price_observations_delete ON price_observations FOR DELETE
  USING (user_id = auth.uid());

-- Community prices for items: median of the last 180 days per store, in the
-- caller's region (zip3) and nationwide. Counts only, no people or households.
CREATE OR REPLACE FUNCTION community_prices(keys TEXT[], zip3 TEXT)
RETURNS TABLE (item_key TEXT, store_key TEXT, store_name TEXT, scope TEXT, median_price NUMERIC, observations INT, households INT, last_seen DATE)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH recent AS (
    SELECT p.* FROM price_observations p
     WHERE p.item_key = ANY (keys[1:200]) AND p.observed_on > current_date - 180
  ),
  scoped AS (
    SELECT r.*, 'region'::text AS scope FROM recent r WHERE zip3 IS NOT NULL AND r.region = zip3
    UNION ALL
    SELECT r.*, 'national'::text AS scope FROM recent r
  )
  SELECT s.item_key, s.store_key, mode() WITHIN GROUP (ORDER BY s.store_name), s.scope,
         round((percentile_cont(0.5) WITHIN GROUP (ORDER BY s.price))::numeric, 2),
         count(*)::int, count(DISTINCT s.household_id)::int, max(s.observed_on)
    FROM scoped s
   GROUP BY s.item_key, s.store_key, s.scope
  HAVING count(DISTINCT s.household_id) >= 2;
$$;
REVOKE ALL ON FUNCTION community_prices(TEXT[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION community_prices(TEXT[], TEXT) TO authenticated;
