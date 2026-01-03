-- Fix scoring calculation to match frontend
-- ISSUE 1: Workouts - database was treating as COUNT (20 points per workout)
--          but frontend treats as MINUTES (0.2 points per minute)
--          This caused 100x score inflation for workouts!
-- ISSUE 2: Stand Hours - missing from SQL function entirely (added in migration 015)
--          Frontend calculates 5 points per stand hour, but database ignored it

CREATE OR REPLACE FUNCTION calculate_points(
    p_steps INTEGER,
    p_sleep_hours DECIMAL,
    p_calories INTEGER,
    p_workouts INTEGER,
    p_distance DECIMAL,
    p_stand_hours INTEGER DEFAULT 0  -- Added stand_hours parameter with default
)
RETURNS DECIMAL AS $$
DECLARE
    POINTS_PER_1000_STEPS CONSTANT DECIMAL := 1;
    POINTS_PER_SLEEP_HOUR CONSTANT DECIMAL := 2;
    POINTS_PER_100_CALORIES CONSTANT DECIMAL := 5;
    POINTS_PER_WORKOUT_MINUTE CONSTANT DECIMAL := 0.2;  -- Changed from 20 to 0.2
    POINTS_PER_STAND_HOUR CONSTANT DECIMAL := 5;        -- Added stand hour scoring
    POINTS_PER_MILE CONSTANT DECIMAL := 3;
    total DECIMAL;
BEGIN
    total := (p_steps / 1000.0) * POINTS_PER_1000_STEPS
           + p_sleep_hours * POINTS_PER_SLEEP_HOUR
           + (p_calories / 100.0) * POINTS_PER_100_CALORIES
           + p_workouts * POINTS_PER_WORKOUT_MINUTE  -- Now workouts are in MINUTES
           + COALESCE(p_stand_hours, 0) * POINTS_PER_STAND_HOUR  -- Added stand hours
           + p_distance * POINTS_PER_MILE;
    RETURN ROUND(total, 2);
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to pass stand_hours
CREATE OR REPLACE FUNCTION auto_calculate_points()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_points := calculate_points(
        NEW.steps,
        NEW.sleep_hours,
        NEW.calories,
        NEW.workouts,
        NEW.distance,
        COALESCE(NEW.stand_hours, 0)  -- Pass stand_hours to calculation
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This migration will not recalculate existing weekly_scores
-- The trigger will only apply to new inserts/updates
-- To recalculate existing scores, you can run:
-- UPDATE weekly_scores SET total_points = calculate_points(steps, sleep_hours, calories, workouts, distance, COALESCE(stand_hours, 0));

