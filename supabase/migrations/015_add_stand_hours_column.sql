-- ============================================
-- ADD STAND_HOURS COLUMN TO WEEKLY_SCORES
-- ============================================

-- Add stand_hours column to weekly_scores table
ALTER TABLE weekly_scores 
ADD COLUMN IF NOT EXISTS stand_hours INTEGER DEFAULT 0;

-- Add comment to document the column
COMMENT ON COLUMN weekly_scores.stand_hours IS 'Number of hours the user stood up during the week (Apple Watch stand hours)';

