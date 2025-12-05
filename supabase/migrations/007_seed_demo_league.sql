-- Seed Demo League with Simulated Data
-- Creates a fully set up league in the middle of a season with fake users and data
-- Run this AFTER running migrations 001-006

-- ============================================
-- CREATE FAKE USERS (if they don't exist)
-- ============================================

-- Note: These users need to exist in auth.users first
-- You'll need to create these users manually in Supabase Auth, or use the app to create them
-- For now, we'll use placeholder UUIDs - replace these with actual user IDs from your auth.users table

-- Get your current user ID (replace with your actual user ID)
-- You can find this by running: SELECT id FROM auth.users LIMIT 1;

-- ============================================
-- CREATE DEMO LEAGUE
-- ============================================

-- Insert demo league (replace 'YOUR_USER_ID' with your actual user ID from auth.users)
DO $$
DECLARE
    demo_league_id UUID;
    demo_user_id UUID;
    week_1_start DATE;
    week_2_start DATE;
    week_3_start DATE;
    week_4_start DATE;
    week_5_start DATE;
BEGIN
    -- Get the first user from auth.users (or replace with specific user ID)
    SELECT id INTO demo_user_id FROM auth.users LIMIT 1;
    
    IF demo_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in auth.users. Please create a user first.';
    END IF;
    
    -- Create demo league
    INSERT INTO leagues (
        name,
        join_code,
        created_by,
        season_length_weeks,
        current_week,
        start_date,
        is_active,
        scoring_config
    ) VALUES (
        'Demo League - Week 4',
        'DEMO42',
        demo_user_id,
        8,
        4,
        CURRENT_DATE - INTERVAL '21 days', -- Started 3 weeks ago
        true,
        '{
            "points_per_1000_steps": 1,
            "points_per_sleep_hour": 2,
            "points_per_100_active_cal": 5,
            "points_per_workout": 20,
            "points_per_mile": 3
        }'::jsonb
    ) RETURNING id INTO demo_league_id;
    
    -- Calculate week start dates
    week_1_start := CURRENT_DATE - INTERVAL '21 days';
    week_2_start := CURRENT_DATE - INTERVAL '14 days';
    week_3_start := CURRENT_DATE - INTERVAL '7 days';
    week_4_start := CURRENT_DATE;
    
    -- Create fake users for the demo (these will be placeholder users)
    -- In a real scenario, you'd create these in auth.users first
    -- For now, we'll create league_members with the demo_user_id repeated
    
    -- Add demo user to league
    INSERT INTO league_members (league_id, user_id, wins, losses, total_points)
    VALUES (demo_league_id, demo_user_id, 2, 1, 450.5)
    ON CONFLICT DO NOTHING;
    
    -- Create matchups for weeks 1-3 (completed)
    -- Week 1 Matchup (demo user vs "Opponent 1")
    INSERT INTO matchups (
        league_id,
        week_number,
        player1_id,
        player2_id,
        player1_score,
        player2_score,
        winner_id,
        is_finalized
    ) VALUES (
        demo_league_id,
        1,
        demo_user_id,
        demo_user_id, -- Using same user as placeholder - in real app, this would be different users
        125.5,
        98.2,
        demo_user_id,
        true
    );
    
    -- Week 2 Matchup
    INSERT INTO matchups (
        league_id,
        week_number,
        player1_id,
        player2_id,
        player1_score,
        player2_score,
        winner_id,
        is_finalized
    ) VALUES (
        demo_league_id,
        2,
        demo_user_id,
        demo_user_id,
        142.8,
        156.3,
        demo_user_id, -- Lost this week
        true
    );
    
    -- Week 3 Matchup
    INSERT INTO matchups (
        league_id,
        week_number,
        player1_id,
        player2_id,
        player1_score,
        player2_score,
        winner_id,
        is_finalized
    ) VALUES (
        demo_league_id,
        3,
        demo_user_id,
        demo_user_id,
        182.4,
        165.7,
        demo_user_id,
        true
    );
    
    -- Week 4 Matchup (current week - active)
    INSERT INTO matchups (
        league_id,
        week_number,
        player1_id,
        player2_id,
        player1_score,
        player2_score,
        is_finalized
    ) VALUES (
        demo_league_id,
        4,
        demo_user_id,
        demo_user_id,
        95.3,
        87.6,
        false
    );
    
    -- Create weekly scores for demo user
    -- Week 1
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
    ) VALUES (
        demo_league_id,
        demo_user_id,
        1,
        12500,
        7.5,
        2500,
        3,
        8.2,
        125.5
    ) ON CONFLICT DO NOTHING;
    
    -- Week 2
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
    ) VALUES (
        demo_league_id,
        demo_user_id,
        2,
        14200,
        8.0,
        3200,
        4,
        12.5,
        142.8
    ) ON CONFLICT DO NOTHING;
    
    -- Week 3
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
    ) VALUES (
        demo_league_id,
        demo_user_id,
        3,
        18200,
        8.5,
        4100,
        5,
        15.8,
        182.4
    ) ON CONFLICT DO NOTHING;
    
    -- Week 4 (current week - in progress)
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
    ) VALUES (
        demo_league_id,
        demo_user_id,
        4,
        9500,
        7.0,
        1900,
        2,
        6.1,
        95.3
    ) ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Demo league created with ID: %', demo_league_id;
    RAISE NOTICE 'Join code: DEMO42';
    RAISE NOTICE 'Current week: 4 of 8';
    RAISE NOTICE 'Your record: 2-1-0';
    
END $$;

-- ============================================
-- NOTES
-- ============================================
-- This creates a demo league with:
-- - League name: "Demo League - Week 4"
-- - Join code: DEMO42
-- - 8 week season, currently in week 4
-- - Your user has a 2-1-0 record
-- - 4 weeks of matchups (3 completed, 1 active)
-- - Weekly scores for all 4 weeks
-- 
-- To use this:
-- 1. Make sure you have at least one user in auth.users
-- 2. Run this migration
-- 3. The league will appear in your app
-- 
-- Note: The matchups use the same user ID for both players as a placeholder.
-- In a real scenario with multiple users, you'd have different user IDs.

