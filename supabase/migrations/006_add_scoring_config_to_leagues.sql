-- Add scoring_config column to leagues table
-- Allows each league to have custom scoring rules

ALTER TABLE leagues 
ADD COLUMN IF NOT EXISTS scoring_config JSONB DEFAULT '{
  "points_per_1000_steps": 1,
  "points_per_sleep_hour": 2,
  "points_per_100_active_cal": 5,
  "points_per_workout": 20,
  "points_per_mile": 3
}'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN leagues.scoring_config IS 'Custom scoring configuration for this league. Defaults to standard scoring if not set.';

-- Create index for faster queries (though JSONB queries are already fast)
CREATE INDEX IF NOT EXISTS idx_leagues_scoring_config ON leagues USING GIN (scoring_config);

