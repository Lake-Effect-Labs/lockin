-- Migration 025: Fix Scoring Config Freeze
-- Fix Plan Phase 3 - Scoring Consistency
-- Addresses: INV-3 (scoring formula frozen at season start)
-- Fixes: Audit 2.3
-- Date: January 5, 2026

-- ============================================
-- PART 1: Update auto_calculate_points() to Use Frozen Config
-- ============================================

-- Update the trigger function to use season_scoring_config (frozen) if available
-- Falls back to scoring_config (editable) for leagues that haven't started
CREATE OR REPLACE FUNCTION auto_calculate_points()
RETURNS TRIGGER AS $$
DECLARE
    league_config JSONB;
BEGIN
    -- Use season_scoring_config if set (frozen at season start)
    -- Otherwise use scoring_config (for leagues that haven't started yet)
    SELECT COALESCE(season_scoring_config, scoring_config) INTO league_config
    FROM leagues
    WHERE id = NEW.league_id;
    
    -- Calculate points using the appropriate config
    NEW.total_points := calculate_points(
        NEW.steps,
        NEW.sleep_hours,
        NEW.calories,
        NEW.workouts,
        NEW.distance,
        COALESCE(NEW.stand_hours, 0),
        league_config
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 2: Update calculate_points() to Accept stand_hours and config
-- ============================================

-- Update calculate_points to accept both stand_hours and scoring_config
CREATE OR REPLACE FUNCTION calculate_points(
    p_steps INTEGER,
    p_sleep_hours DECIMAL,
    p_calories INTEGER,
    p_workouts INTEGER,
    p_distance DECIMAL,
    p_stand_hours INTEGER DEFAULT 0,
    p_scoring_config JSONB DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    points_per_1000_steps DECIMAL;
    points_per_sleep_hour DECIMAL;
    points_per_100_calories DECIMAL;
    points_per_workout_minute DECIMAL;
    points_per_stand_hour DECIMAL;
    points_per_mile DECIMAL;
    total DECIMAL;
BEGIN
    -- Use league config if provided, otherwise use defaults
    IF p_scoring_config IS NOT NULL THEN
        points_per_1000_steps := COALESCE((p_scoring_config->>'points_per_1000_steps')::DECIMAL, 1);
        points_per_sleep_hour := COALESCE((p_scoring_config->>'points_per_sleep_hour')::DECIMAL, 2);
        points_per_100_calories := COALESCE((p_scoring_config->>'points_per_100_active_cal')::DECIMAL, 5);
        
        -- Support both old and new workout key names for backward compatibility
        points_per_workout_minute := COALESCE((p_scoring_config->>'points_per_workout_minute')::DECIMAL, 
                                              (p_scoring_config->>'points_per_workout')::DECIMAL, 
                                              0.2);
        
        points_per_stand_hour := COALESCE((p_scoring_config->>'points_per_stand_hour')::DECIMAL, 5);
        points_per_mile := COALESCE((p_scoring_config->>'points_per_mile')::DECIMAL, 3);
    ELSE
        -- Default values matching frontend
        points_per_1000_steps := 1;
        points_per_sleep_hour := 2;
        points_per_100_calories := 5;
        points_per_workout_minute := 0.2;  -- Minutes, not count
        points_per_stand_hour := 5;
        points_per_mile := 3;
    END IF;
    
    total := (p_steps / 1000.0) * points_per_1000_steps
           + p_sleep_hours * points_per_sleep_hour
           + (p_calories / 100.0) * points_per_100_calories
           + p_workouts * points_per_workout_minute  -- Workouts are in MINUTES
           + COALESCE(p_stand_hours, 0) * points_per_stand_hour
           + p_distance * points_per_mile;
    RETURN ROUND(total, 2);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 3: Create Trigger to Snapshot Config When League Starts
-- ============================================

-- Function to snapshot scoring config when league starts
CREATE OR REPLACE FUNCTION snapshot_scoring_config_on_start()
RETURNS TRIGGER AS $$
BEGIN
    -- If start_date is being set (from NULL to a value) and season_scoring_config is not yet set
    IF NEW.start_date IS NOT NULL 
       AND OLD.start_date IS NULL 
       AND NEW.season_scoring_config IS NULL THEN
        -- Snapshot the current scoring_config
        NEW.season_scoring_config := NEW.scoring_config;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on leagues table
DROP TRIGGER IF EXISTS snapshot_scoring_config_trigger ON leagues;
CREATE TRIGGER snapshot_scoring_config_trigger
    BEFORE UPDATE ON leagues
    FOR EACH ROW
    EXECUTE FUNCTION snapshot_scoring_config_on_start();

-- ============================================
-- PART 4: Add Comments for Documentation
-- ============================================

COMMENT ON FUNCTION auto_calculate_points() IS 'Trigger function that calculates weekly_scores.total_points using the frozen season_scoring_config (if league has started) or editable scoring_config (if league not started). Ensures mid-season config changes do not affect active competitions.';
COMMENT ON FUNCTION calculate_points(INTEGER, DECIMAL, INTEGER, INTEGER, DECIMAL, INTEGER, JSONB) IS 'Calculates total points from health metrics using provided scoring config. Supports both points_per_workout_minute (new) and points_per_workout (legacy) keys for backward compatibility.';
COMMENT ON FUNCTION snapshot_scoring_config_on_start() IS 'Trigger function that freezes scoring_config into season_scoring_config when league start_date is set. This ensures scoring rules cannot be changed mid-season.';

