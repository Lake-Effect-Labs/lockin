-- Update calculate_points function to accept league scoring config
-- Also update the trigger to use league-specific scoring

-- Drop the old function
DROP FUNCTION IF EXISTS calculate_points(INTEGER, DECIMAL, INTEGER, INTEGER, DECIMAL);

-- Create new function that accepts scoring config
CREATE OR REPLACE FUNCTION calculate_points(
    p_steps INTEGER,
    p_sleep_hours DECIMAL,
    p_calories INTEGER,
    p_workouts INTEGER,
    p_distance DECIMAL,
    p_scoring_config JSONB DEFAULT NULL
)
RETURNS DECIMAL AS $$
DECLARE
    points_per_1000_steps DECIMAL;
    points_per_sleep_hour DECIMAL;
    points_per_100_calories DECIMAL;
    points_per_workout DECIMAL;
    points_per_mile DECIMAL;
    total DECIMAL;
BEGIN
    -- Use league config if provided, otherwise use defaults
    IF p_scoring_config IS NOT NULL THEN
        points_per_1000_steps := COALESCE((p_scoring_config->>'points_per_1000_steps')::DECIMAL, 1);
        points_per_sleep_hour := COALESCE((p_scoring_config->>'points_per_sleep_hour')::DECIMAL, 2);
        points_per_100_calories := COALESCE((p_scoring_config->>'points_per_100_active_cal')::DECIMAL, 5);
        points_per_workout := COALESCE((p_scoring_config->>'points_per_workout')::DECIMAL, 20);
        points_per_mile := COALESCE((p_scoring_config->>'points_per_mile')::DECIMAL, 3);
    ELSE
        points_per_1000_steps := 1;
        points_per_sleep_hour := 2;
        points_per_100_calories := 5;
        points_per_workout := 20;
        points_per_mile := 3;
    END IF;
    
    total := (p_steps / 1000.0) * points_per_1000_steps
           + p_sleep_hours * points_per_sleep_hour
           + (p_calories / 100.0) * points_per_100_calories
           + p_workouts * points_per_workout
           + p_distance * points_per_mile;
    RETURN ROUND(total, 2);
END;
$$ LANGUAGE plpgsql;

-- Update the trigger function to use league's scoring config
CREATE OR REPLACE FUNCTION auto_calculate_points()
RETURNS TRIGGER AS $$
DECLARE
    league_config JSONB;
BEGIN
    -- Get the league's scoring config
    SELECT scoring_config INTO league_config
    FROM leagues
    WHERE id = NEW.league_id;
    
    -- Calculate points using league-specific config
    NEW.total_points := calculate_points(
        NEW.steps,
        NEW.sleep_hours,
        NEW.calories,
        NEW.workouts,
        NEW.distance,
        league_config
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The trigger itself doesn't need to be recreated, just the function

