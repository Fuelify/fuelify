-- Behavior event log: an append-only record of what each person in a household
-- does with their plan, list and cart (swaps, shuffles, skips, product picks…).
--
-- Every change that says something about a household's preferences is written
-- here as one row, and rows are never updated or deleted by the app. The
-- current state still lives on the normal tables (meals.ingredient_swaps,
-- household_grocery, …); this table is the history behind it, shaped for
-- analytics, recommendations and model training:
--   * one row per decision, with typed columns for the common fields
--     (from → to, normalized keys, categories, store/product/price)
--   * whether the person took a suggestion and which one (rank), or typed
--     their own, so suggestions can be scored
--   * a `context` snapshot (diet, allergens, grocery strategy, plan tier)
--     so a model sees the settings in force when the decision was made
--   * `payload` for event-specific detail; `schema_version` for evolving it
-- See packages/shared/src/models/behavior-event.ts for the event catalogue.

CREATE TABLE IF NOT EXISTS behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'ingredient_swapped', 'ingredient_swap_reverted',
    'meal_added', 'meal_removed', 'meal_moved', 'meal_shuffled', 'meal_rated',
    'meal_plan_generated', 'meal_plan_cleared',
    'list_item_skipped', 'list_item_unskipped',
    'cart_built', 'cart_product_chosen', 'cart_line_removed', 'cart_cleared',
    'product_searched', 'cart_checkout_started'
  )),
  -- Where in the app it happened
  surface TEXT CHECK (surface IN ('plan', 'recipe', 'list', 'cart', 'search', 'generator')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_ts TIMESTAMPTZ,
  -- One app load; groups events from the same sitting
  session_id TEXT,

  -- The meal it concerns. No FK: meals get deleted, the history stays.
  meal_id UUID,
  meal_date DATE,
  meal_type TEXT,
  recipe_id UUID,
  recipe_title TEXT,

  -- What changed: ingredient lines, recipes or products
  from_text TEXT,
  to_text TEXT,
  -- Normalized ingredient keys (ingredientKey) or recipe ids, for grouping
  from_key TEXT,
  to_key TEXT,
  -- Aisle categories (categorizeIngredient), e.g. Meat & Seafood → Produce
  from_category TEXT,
  to_category TEXT,

  -- Suggestions: rank of the one taken (0 = top), how many were shown.
  -- For cart_product_chosen: rank by price among the options (0 = cheapest).
  -- NULL rank with a count means the person typed their own.
  suggestion_rank SMALLINT,
  suggestion_count SMALLINT,

  -- Products
  store TEXT,
  product_id TEXT,
  product_name TEXT,
  price NUMERIC(10, 2),
  -- Was this the app's recommended ("Best pick") option?
  recommended BOOLEAN,

  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  schema_version SMALLINT NOT NULL DEFAULT 1
);

COMMENT ON TABLE behavior_events IS 'Append-only log of household decisions (swaps, shuffles, skips, product picks) for traceability, recommendations and model training. See models/behavior-event.ts';

CREATE INDEX IF NOT EXISTS behavior_events_household_time ON behavior_events (household_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS behavior_events_user_time ON behavior_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS behavior_events_type_time ON behavior_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS behavior_events_swaps ON behavior_events (household_id, from_key, to_key)
  WHERE event_type IN ('ingredient_swapped', 'ingredient_swap_reverted');
CREATE INDEX IF NOT EXISTS behavior_events_meal ON behavior_events (meal_id) WHERE meal_id IS NOT NULL;

-- Fill in the household from the user's membership when the client doesn't send one
CREATE OR REPLACE FUNCTION behavior_events_fill_household()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.household_id IS NULL THEN
    SELECT household_id INTO NEW.household_id
      FROM household_members WHERE user_id = NEW.user_id
      ORDER BY joined_at LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS behavior_events_household ON behavior_events;
CREATE TRIGGER behavior_events_household
  BEFORE INSERT ON behavior_events FOR EACH ROW EXECUTE FUNCTION behavior_events_fill_household();

-- Append-only: members read their household's history and write their own
-- events. No UPDATE or DELETE policies, so the app can't rewrite history.
ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY behavior_events_select ON behavior_events FOR SELECT
  USING (user_id = auth.uid() OR (household_id IS NOT NULL AND is_household_member(household_id)));
CREATE POLICY behavior_events_insert ON behavior_events FOR INSERT
  WITH CHECK (user_id = auth.uid() AND (household_id IS NULL OR is_household_member(household_id)));

-- Features: how often a household swaps one ingredient for another.
-- e.g. (ground beef → ground turkey, 7 swaps, 1 undo, last 2026-10-12).
CREATE OR REPLACE VIEW household_ingredient_swap_stats WITH (security_invoker = true) AS
SELECT
  household_id,
  from_key,
  to_key,
  max(from_category) AS from_category,
  max(to_category) AS to_category,
  count(*) FILTER (WHERE event_type = 'ingredient_swapped') AS swaps,
  count(*) FILTER (WHERE event_type = 'ingredient_swap_reverted') AS reverts,
  count(DISTINCT meal_id) FILTER (WHERE event_type = 'ingredient_swapped') AS meals,
  count(DISTINCT recipe_id) FILTER (WHERE event_type = 'ingredient_swapped') AS recipes,
  count(DISTINCT user_id) AS members,
  count(*) FILTER (WHERE event_type = 'ingredient_swapped' AND suggestion_rank IS NOT NULL) AS from_suggestion,
  min(occurred_at) AS first_at,
  max(occurred_at) AS last_at
FROM behavior_events
WHERE event_type IN ('ingredient_swapped', 'ingredient_swap_reverted') AND from_key IS NOT NULL
GROUP BY household_id, from_key, to_key;

-- Features: how a household treats each recipe in its plans.
CREATE OR REPLACE VIEW household_recipe_stats WITH (security_invoker = true) AS
SELECT
  household_id,
  key AS recipe_id,
  count(*) FILTER (WHERE event_type = 'meal_shuffled' AND from_key = key) AS shuffled_away,
  count(*) FILTER (WHERE event_type = 'meal_shuffled' AND to_key = key) AS shuffled_to,
  count(*) FILTER (WHERE event_type = 'meal_added' AND to_key = key) AS added,
  count(*) FILTER (WHERE event_type = 'meal_removed' AND from_key = key) AS removed,
  avg((payload->>'rating')::numeric) FILTER (WHERE event_type = 'meal_rated' AND recipe_id::text = key) AS avg_rating,
  max(occurred_at) AS last_at
FROM behavior_events
-- Each distinct recipe on the row once (shuffles touch two: from and to)
CROSS JOIN LATERAL (
  SELECT DISTINCT v.k AS key FROM (VALUES (from_key), (to_key), (recipe_id::text)) AS v(k) WHERE v.k IS NOT NULL
) AS k
WHERE event_type IN ('meal_shuffled', 'meal_added', 'meal_removed', 'meal_rated')
GROUP BY household_id, key;

-- Features: product picks per store, and how often the recommendation is overridden.
CREATE OR REPLACE VIEW household_product_choice_stats WITH (security_invoker = true) AS
SELECT
  household_id,
  from_key AS ingredient_key,
  store,
  product_id,
  max(product_name) AS product_name,
  count(*) AS times_chosen,
  count(*) FILTER (WHERE recommended IS FALSE) AS over_recommendation,
  avg(price) AS avg_price,
  max(occurred_at) AS last_at
FROM behavior_events
WHERE event_type = 'cart_product_chosen' AND product_id IS NOT NULL
GROUP BY household_id, from_key, store, product_id;
