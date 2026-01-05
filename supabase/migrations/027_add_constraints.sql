-- Migration 027: Add Data Integrity Constraints
-- Fix Plan Phase 4 - Data Constraints
-- Addresses: INV-7 (week boundaries deterministic), Audit 3.5
-- Date: January 5, 2026

-- ============================================
-- PART 1: Fix Existing Non-Monday start_dates
-- ============================================
-- RATIONALE: Some existing leagues may have start_dates that are not Mondays.
-- This could happen if leagues were created before the Monday constraint existed.
-- We fix this by moving start_dates to the PREVIOUS Monday to maintain week alignment.
-- This is safe because:
-- 1. It preserves the relative week structure (week 1, week 2, etc.)
-- 2. It ensures all leagues use Monday-Sunday week boundaries
-- 3. It's a one-time migration that won't affect future leagues

-- First, identify and fix any existing leagues with non-Monday start_dates
-- Move them to the previous Monday to maintain week alignment
DO $$
DECLARE
    fixed_count INTEGER;
    league_record RECORD;
    table_exists BOOLEAN;
BEGIN
    -- Check if leagues table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'leagues'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE NOTICE 'Leagues table does not exist yet - skipping start_date correction';
        RETURN;
    END IF;
    
    -- Count how many leagues need fixing
    SELECT COUNT(*) INTO fixed_count
    FROM public.leagues
    WHERE start_date IS NOT NULL 
    AND EXTRACT(DOW FROM start_date) != 1;
    
    IF fixed_count > 0 THEN
        RAISE NOTICE 'Found % leagues with non-Monday start_dates, fixing...', fixed_count;
        
        -- Log each league being fixed
        FOR league_record IN 
            SELECT id, name, start_date, EXTRACT(DOW FROM start_date) as dow
            FROM public.leagues
            WHERE start_date IS NOT NULL 
            AND EXTRACT(DOW FROM start_date) != 1
        LOOP
            RAISE NOTICE 'League "%" (%) had start_date on day % (not Monday)', 
                league_record.name, league_record.id, league_record.dow;
        END LOOP;
        
        -- Fix all non-Monday start_dates by moving to previous Monday
        -- DOW: 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
        -- For Sunday (0), go back 6 days to get previous Monday
        -- For Tuesday-Saturday (2-6), go back (dow - 1) days to get previous Monday
        UPDATE public.leagues
        SET start_date = CASE
            WHEN EXTRACT(DOW FROM start_date) = 0 THEN start_date - INTERVAL '6 days'
            ELSE start_date - CAST((EXTRACT(DOW FROM start_date) - 1) AS INTEGER) * INTERVAL '1 day'
        END
        WHERE start_date IS NOT NULL 
        AND EXTRACT(DOW FROM start_date) != 1;
        
        RAISE NOTICE 'Fixed % leagues - moved start_dates to previous Monday', fixed_count;
    ELSE
        RAISE NOTICE 'All leagues already have Monday start_dates (or NULL) - no correction needed';
    END IF;
END $$;

-- ============================================
-- PART 2: Add Monday Constraint to start_date
-- ============================================

-- Now add the constraint (all existing data should be valid)
-- Ensure start_date is always a Monday (or NULL for leagues not yet started)
-- In PostgreSQL, EXTRACT(DOW FROM date) returns 0=Sunday, 1=Monday, ..., 6=Saturday
ALTER TABLE leagues 
ADD CONSTRAINT start_date_must_be_monday
CHECK (start_date IS NULL OR EXTRACT(DOW FROM start_date) = 1);

-- ============================================
-- PART 2: Add Validation Function for Matchup Generation
-- ============================================

-- Function to validate that no player appears twice in the same week
CREATE OR REPLACE FUNCTION validate_matchup_no_duplicates(p_league_id UUID, p_week_number INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Check if any player appears more than once in the same week
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT player_id, COUNT(*) as appearances
        FROM (
            SELECT player1_id AS player_id 
            FROM matchups 
            WHERE league_id = p_league_id AND week_number = p_week_number
            UNION ALL
            SELECT player2_id AS player_id 
            FROM matchups 
            WHERE league_id = p_league_id AND week_number = p_week_number
        ) sub
        GROUP BY player_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RETURN duplicate_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 3: Update generate_matchups() with Validation
-- ============================================

-- Update generate_matchups to include validation and guard against re-generation
CREATE OR REPLACE FUNCTION generate_matchups(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    members UUID[];
    member_count INTEGER;
    week INTEGER;
    i INTEGER;
    season_length INTEGER;
    rotated UUID[];
    home_idx INTEGER;
    away_idx INTEGER;
BEGIN
    -- ============================================
    -- GUARD: Acquire advisory lock
    -- ============================================
    PERFORM pg_advisory_xact_lock(hashtext('matchups-' || p_league_id::text));
    
    -- Get all members
    SELECT ARRAY_AGG(user_id ORDER BY joined_at) INTO members
    FROM league_members
    WHERE league_id = p_league_id;
    
    member_count := array_length(members, 1);
    
    IF member_count IS NULL OR member_count < 2 THEN
        RETURN;
    END IF;
    
    -- Get season length
    SELECT season_length_weeks INTO season_length
    FROM leagues WHERE id = p_league_id;
    
    -- If odd number, add a "bye" placeholder (NULL)
    IF member_count % 2 = 1 THEN
        members := array_append(members, NULL::UUID);
        member_count := member_count + 1;
    END IF;
    
    -- Round-robin scheduling
    FOR week IN 1..season_length LOOP
        -- ============================================
        -- GUARD: Check if matchups already exist for this week
        -- ============================================
        IF EXISTS (SELECT 1 FROM matchups WHERE league_id = p_league_id AND week_number = week) THEN
            CONTINUE; -- Skip this week, matchups already generated
        END IF;
        
        rotated := members;
        
        -- Rotate for this week (keep first element fixed)
        IF week > 1 THEN
            FOR i IN 1..(week - 1) LOOP
                rotated := ARRAY[rotated[1]] || rotated[member_count] || rotated[2:member_count-1];
            END LOOP;
        END IF;
        
        -- Create matchups
        FOR i IN 1..(member_count / 2) LOOP
            home_idx := i;
            away_idx := member_count - i + 1;
            
            -- Skip if either is NULL (bye week)
            IF rotated[home_idx] IS NOT NULL AND rotated[away_idx] IS NOT NULL THEN
                INSERT INTO matchups (league_id, week_number, player1_id, player2_id)
                VALUES (p_league_id, week, rotated[home_idx], rotated[away_idx])
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
        
        -- ============================================
        -- VALIDATION: Ensure no player appears twice in this week
        -- ============================================
        IF NOT validate_matchup_no_duplicates(p_league_id, week) THEN
            RAISE EXCEPTION 'Invalid matchup generation: player appears twice in week %', week;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 4: Add Comments for Documentation
-- ============================================

COMMENT ON CONSTRAINT start_date_must_be_monday ON leagues IS 'Ensures league start_date is always a Monday (DOW=1) for consistent week calculations. NULL is allowed for leagues not yet started.';
COMMENT ON FUNCTION validate_matchup_no_duplicates(UUID, INTEGER) IS 'Validates that no player appears in multiple matchups in the same week. Returns TRUE if valid, FALSE if duplicates found.';
COMMENT ON FUNCTION generate_matchups(UUID) IS 'Generates round-robin matchup schedule for a league. Idempotent: skips weeks that already have matchups. Validates that no player appears twice in same week.';

