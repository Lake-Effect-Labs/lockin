-- Migration 021: Fix finalize_week() Idempotency
-- Fix Plan Phase 1 - Trust Killers
-- Addresses: INV-1 (week can only be finalized once), INV-2 (no double point accumulation)
-- Fixes: Audit 2.1, 2.2, 3.1
-- Date: January 5, 2026

-- ============================================
-- Replace finalize_week() with Idempotent Version
-- ============================================

CREATE OR REPLACE FUNCTION finalize_week(p_league_id UUID, p_week INTEGER)
RETURNS VOID AS $$
DECLARE
    matchup RECORD;
    p1_score DECIMAL;
    p2_score DECIMAL;
    matchups_finalized_count INTEGER := 0;
    current_league_week INTEGER;
    league_playoffs_started BOOLEAN;
BEGIN
    -- ============================================
    -- GUARD 1: Acquire advisory lock for this league-week
    -- Serializes all concurrent calls for the same league-week
    -- ============================================
    PERFORM pg_advisory_xact_lock(hashtext('finalize-week-' || p_league_id::text || '-' || p_week::text));
    
    -- ============================================
    -- GUARD 2: Check if playoffs have started
    -- If playoffs started, don't finalize regular season weeks
    -- ============================================
    SELECT playoffs_started INTO league_playoffs_started
    FROM leagues WHERE id = p_league_id;
    
    IF league_playoffs_started = TRUE THEN
        RETURN; -- Don't finalize regular season weeks during playoffs
    END IF;
    
    -- ============================================
    -- GUARD 3: Check if we're already past this week
    -- If current_week != p_week, this week was already finalized
    -- ============================================
    SELECT current_week INTO current_league_week
    FROM leagues WHERE id = p_league_id;
    
    IF current_league_week != p_week THEN
        RETURN; -- Already past this week, idempotent no-op
    END IF;
    
    -- ============================================
    -- GUARD 4: Validate week bounds
    -- Prevent invalid week numbers
    -- ============================================
    IF p_week < 1 OR p_week > (SELECT season_length_weeks FROM leagues WHERE id = p_league_id) THEN
        RETURN; -- Invalid week number
    END IF;
    
    -- ============================================
    -- PROCESS: Finalize all unfinalized matchups for this week
    -- ============================================
    FOR matchup IN 
        SELECT * FROM matchups 
        WHERE league_id = p_league_id 
        AND week_number = p_week 
        AND NOT is_finalized
    LOOP
        -- Get current scores from weekly_scores
        SELECT COALESCE(total_points, 0) INTO p1_score
        FROM weekly_scores 
        WHERE league_id = p_league_id 
        AND user_id = matchup.player1_id 
        AND week_number = p_week;
        
        SELECT COALESCE(total_points, 0) INTO p2_score
        FROM weekly_scores 
        WHERE league_id = p_league_id 
        AND user_id = matchup.player2_id 
        AND week_number = p_week;
        
        -- Handle NULL (no score recorded)
        p1_score := COALESCE(p1_score, 0);
        p2_score := COALESCE(p2_score, 0);
        
        -- Update matchup scores
        UPDATE matchups SET
            player1_score = p1_score,
            player2_score = p2_score
        WHERE id = matchup.id;
        
        -- Determine winner and update records
        IF p1_score > p2_score THEN
            UPDATE matchups SET 
                winner_id = matchup.player1_id, 
                is_finalized = TRUE,
                finalized_at = NOW()
            WHERE id = matchup.id;
            
            UPDATE league_members SET wins = wins + 1 
            WHERE league_id = p_league_id AND user_id = matchup.player1_id;
            
            UPDATE league_members SET losses = losses + 1 
            WHERE league_id = p_league_id AND user_id = matchup.player2_id;
            
        ELSIF p2_score > p1_score THEN
            UPDATE matchups SET 
                winner_id = matchup.player2_id, 
                is_finalized = TRUE,
                finalized_at = NOW()
            WHERE id = matchup.id;
            
            UPDATE league_members SET wins = wins + 1 
            WHERE league_id = p_league_id AND user_id = matchup.player2_id;
            
            UPDATE league_members SET losses = losses + 1 
            WHERE league_id = p_league_id AND user_id = matchup.player1_id;
            
        ELSE
            -- Tie - both players get a tie
            UPDATE matchups SET 
                is_tie = TRUE, 
                is_finalized = TRUE,
                finalized_at = NOW()
            WHERE id = matchup.id;
            
            UPDATE league_members SET ties = ties + 1 
            WHERE league_id = p_league_id AND user_id = matchup.player1_id;
            
            UPDATE league_members SET ties = ties + 1 
            WHERE league_id = p_league_id AND user_id = matchup.player2_id;
        END IF;
        
        -- ============================================
        -- IDEMPOTENT POINT ACCUMULATION
        -- Only add points if not already added
        -- ============================================
        IF NOT matchup.points_added THEN
            -- Add points to league_members.total_points
            UPDATE league_members 
            SET total_points = total_points + p1_score
            WHERE league_id = p_league_id AND user_id = matchup.player1_id;
            
            UPDATE league_members 
            SET total_points = total_points + p2_score
            WHERE league_id = p_league_id AND user_id = matchup.player2_id;
            
            -- Mark as added and snapshot the values for audit
            UPDATE matchups SET
                points_added = TRUE,
                p1_points_snapshot = p1_score,
                p2_points_snapshot = p2_score
            WHERE id = matchup.id;
        END IF;
        
        matchups_finalized_count := matchups_finalized_count + 1;
    END LOOP;
    
    -- ============================================
    -- CONDITIONAL WEEK ADVANCEMENT
    -- Only advance week if we actually finalized matchups
    -- The WHERE clause ensures only ONE call can advance the week
    -- ============================================
    IF matchups_finalized_count > 0 THEN
        UPDATE leagues 
        SET 
            current_week = current_week + 1,
            last_week_finalized_at = NOW()
        WHERE id = p_league_id 
        AND current_week = p_week; -- Conditional: only if still on this week
    END IF;
    
    -- Advisory lock automatically releases at transaction end
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Add Comment for Documentation
-- ============================================
COMMENT ON FUNCTION finalize_week(UUID, INTEGER) IS 'Idempotent function to finalize a week. Uses advisory locks and guard clauses to prevent double week advancement and double point accumulation. Safe to call multiple times concurrently.';

