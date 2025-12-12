-- Update existing demo league to week 5
-- Run this if you already have a demo league seeded at week 4

DO $$
DECLARE
    demo_league_id UUID;
    demo_user_id UUID;
    week_5_start DATE;
BEGIN
    -- Find the demo league
    SELECT id INTO demo_league_id FROM leagues WHERE join_code = 'DEMO42' LIMIT 1;
    
    IF demo_league_id IS NULL THEN
        RAISE NOTICE 'Demo league not found. Run migration 007_seed_demo_league.sql first.';
        RETURN;
    END IF;
    
    -- Get the user ID from the league
    SELECT created_by INTO demo_user_id FROM leagues WHERE id = demo_league_id;
    
    -- Calculate week 5 start date (4 weeks after start_date, must be a Monday)
    SELECT DATE_TRUNC('week', start_date + INTERVAL '28 days')::DATE INTO week_5_start
    FROM leagues WHERE id = demo_league_id;
    
    -- If truncated date is Sunday, go back 6 days to get Monday
    IF EXTRACT(DOW FROM week_5_start) = 0 THEN
        week_5_start := week_5_start - INTERVAL '6 days';
    END IF;
    
    -- Update league to week 5
    UPDATE leagues 
    SET 
        current_week = 5,
        name = 'Demo League - Week 5'
    WHERE id = demo_league_id;
    
    -- Finalize week 4 matchup if it exists and isn't finalized
    UPDATE matchups 
    SET 
        is_finalized = true,
        winner_id = CASE 
            WHEN player1_score > player2_score THEN player1_id
            WHEN player2_score > player1_score THEN player2_id
            ELSE NULL
        END
    WHERE league_id = demo_league_id 
        AND week_number = 4 
        AND is_finalized = false;
    
    -- Update member record (should be 3-1-0 after week 4)
    UPDATE league_members
    SET 
        wins = 3,
        losses = 1,
        total_points = 545.7
    WHERE league_id = demo_league_id 
        AND user_id = demo_user_id;
    
    -- Create week 5 matchup if it doesn't exist
    INSERT INTO matchups (
        league_id,
        week_number,
        player1_id,
        player2_id,
        player1_score,
        player2_score,
        is_finalized
    )
    SELECT 
        demo_league_id,
        5,
        demo_user_id,
        demo_user_id,
        105.2,
        98.4,
        false
    WHERE NOT EXISTS (
        SELECT 1 FROM matchups 
        WHERE league_id = demo_league_id AND week_number = 5
    );
    
    -- Create week 5 weekly score if it doesn't exist
    INSERT INTO weekly_scores (
        league_id,
        user_id,
        week_number,
        steps,
        sleep_hours,
        calories,
        workouts,
        distance,
        total_points
    )
    SELECT 
        demo_league_id,
        demo_user_id,
        5,
        10500,
        7.5,
        2100,
        3,
        7.2,
        105.2
    WHERE NOT EXISTS (
        SELECT 1 FROM weekly_scores 
        WHERE league_id = demo_league_id 
            AND user_id = demo_user_id 
            AND week_number = 5
    );
    
    RAISE NOTICE 'Demo league updated to week 5';
    RAISE NOTICE 'Week 5 matchup created';
    RAISE NOTICE 'Record updated to 3-1-0';
    
END $$;

