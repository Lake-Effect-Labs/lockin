-- Migration 026: Fix Workout Units Naming
-- Fix Plan Phase 3 - Scoring Consistency
-- Addresses: Audit 3.3 (workout unit mismatch)
-- Date: January 5, 2026

-- ============================================
-- PART 1: Update Existing Leagues to Use Correct Key Name
-- ============================================

-- Update all existing leagues that have scoring_config with the old key
-- Change 'points_per_workout' to 'points_per_workout_minute' for clarity
UPDATE leagues
SET scoring_config = jsonb_set(
    scoring_config - 'points_per_workout',
    '{points_per_workout_minute}',
    COALESCE(scoring_config->'points_per_workout', '0.2'::jsonb)
)
WHERE scoring_config ? 'points_per_workout'
AND NOT scoring_config ? 'points_per_workout_minute';

-- Update season_scoring_config as well for leagues that have already started
UPDATE leagues
SET season_scoring_config = jsonb_set(
    season_scoring_config - 'points_per_workout',
    '{points_per_workout_minute}',
    COALESCE(season_scoring_config->'points_per_workout', '0.2'::jsonb)
)
WHERE season_scoring_config IS NOT NULL
AND season_scoring_config ? 'points_per_workout'
AND NOT season_scoring_config ? 'points_per_workout_minute';

-- ============================================
-- PART 2: Add Comment to weekly_scores.workouts Column
-- ============================================

COMMENT ON COLUMN weekly_scores.workouts IS 'Total workout time in MINUTES (not count). Scored at 0.2 points per minute by default.';

-- ============================================
-- PART 3: Document the Correct Default Scoring Config
-- ============================================

-- Document the correct default scoring config structure
-- This is for reference - actual defaults are in calculate_points() function
COMMENT ON COLUMN leagues.scoring_config IS 'League scoring configuration (editable before season starts). Default: {"points_per_1000_steps": 1, "points_per_sleep_hour": 2, "points_per_100_active_cal": 5, "points_per_workout_minute": 0.2, "points_per_stand_hour": 5, "points_per_mile": 3}';

