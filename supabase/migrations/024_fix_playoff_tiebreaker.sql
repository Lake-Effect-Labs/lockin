-- Migration 024: Fix Playoff Tiebreaker
-- Fix Plan Phase 2 - Playoff Integrity
-- Addresses: INV-5 (playoff tiebreaker uses frozen snapshot)
-- Fixes: Audit 2.5
-- Date: January 5, 2026

-- ============================================
-- Replace finalize_playoff_match() to Use Frozen Tiebreaker
-- ============================================

CREATE OR REPLACE FUNCTION finalize_playoff_match(p_playoff_id UUID)
RETURNS VOID AS $$
DECLARE
    playoff RECORD;
    winner UUID;
    loser UUID;
    other_semi RECORD;
    finals_week INTEGER;
    p1_total_points DECIMAL;
    p2_total_points DECIMAL;
BEGIN
    -- ============================================
    -- GUARD 1: Acquire advisory lock for this playoff match
    -- ============================================
    PERFORM pg_advisory_xact_lock(hashtext('playoff-match-' || p_playoff_id::text));
    
    -- Get playoff match details
    SELECT * INTO playoff FROM playoffs WHERE id = p_playoff_id;
    
    -- ============================================
    -- GUARD 2: Check if already finalized
    -- ============================================
    IF playoff.is_finalized = TRUE THEN
        RETURN; -- Already finalized, idempotent no-op
    END IF;
    
    -- ============================================
    -- PROCESS: Determine winner
    -- ============================================
    
    -- Handle tie using FROZEN playoff_tiebreaker_points
    IF playoff.player1_score = playoff.player2_score THEN
        -- Use playoff_tiebreaker_points (frozen at playoff generation)
        -- NOT total_points (which can change with late health syncs)
        SELECT playoff_tiebreaker_points INTO p1_total_points
        FROM league_members
        WHERE league_id = playoff.league_id AND user_id = playoff.player1_id;
        
        SELECT playoff_tiebreaker_points INTO p2_total_points
        FROM league_members
        WHERE league_id = playoff.league_id AND user_id = playoff.player2_id;
        
        -- Tiebreaker: higher frozen points wins
        IF p1_total_points > p2_total_points THEN
            winner := playoff.player1_id;
            loser := playoff.player2_id;
        ELSIF p2_total_points > p1_total_points THEN
            winner := playoff.player2_id;
            loser := playoff.player1_id;
        ELSE
            -- If still tied, player1 wins (arbitrary but deterministic)
            winner := playoff.player1_id;
            loser := playoff.player2_id;
        END IF;
    ELSIF playoff.player1_score > playoff.player2_score THEN
        winner := playoff.player1_id;
        loser := playoff.player2_id;
    ELSE
        winner := playoff.player2_id;
        loser := playoff.player1_id;
    END IF;
    
    -- Update playoff match
    UPDATE playoffs 
    SET 
        winner_id = winner, 
        is_finalized = TRUE 
    WHERE id = p_playoff_id;
    
    -- Mark loser as eliminated
    UPDATE league_members 
    SET is_eliminated = TRUE 
    WHERE league_id = playoff.league_id AND user_id = loser;
    
    -- ============================================
    -- PROCESS: Create finals if both semifinals complete
    -- ============================================
    IF playoff.round = 1 THEN
        SELECT * INTO other_semi 
        FROM playoffs 
        WHERE league_id = playoff.league_id 
        AND round = 1 
        AND match_number != playoff.match_number;
        
        IF other_semi.is_finalized THEN
            finals_week := playoff.week_number + 1;
            
            -- Create finals match
            INSERT INTO playoffs (league_id, round, match_number, player1_id, player2_id, week_number)
            VALUES (playoff.league_id, 2, 1, winner, other_semi.winner_id, finals_week)
            ON CONFLICT DO NOTHING; -- Idempotent: if finals already exist, do nothing
        END IF;
        
    -- ============================================
    -- PROCESS: Crown champion if finals complete
    -- ============================================
    ELSIF playoff.round = 2 THEN
        -- Finals complete - crown champion
        UPDATE leagues 
        SET 
            champion_id = winner, 
            is_active = FALSE 
        WHERE id = playoff.league_id;
    END IF;
    
    -- Advisory lock automatically releases at transaction end
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Add Comment for Documentation
-- ============================================
COMMENT ON FUNCTION finalize_playoff_match(UUID) IS 'Idempotent function to finalize a playoff match. Uses frozen playoff_tiebreaker_points for tiebreakers instead of mutable total_points. This prevents late health syncs from affecting playoff outcomes.';

