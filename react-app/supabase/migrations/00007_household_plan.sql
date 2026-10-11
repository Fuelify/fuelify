-- Subscription plan belongs to the household (members share one plan).
-- 'standard' is the free tier. Owners can change it under the existing
-- households_update policy; until billing exists the app lets owners switch
-- freely (see HouseholdRepository.setPlan).

ALTER TABLE households
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'standard'
  CONSTRAINT households_plan_check CHECK (plan IN ('standard', 'premium'));

-- profiles.plan predates household plans and is no longer read by the app.
COMMENT ON COLUMN profiles.plan IS 'Deprecated: plans live on households.plan';
