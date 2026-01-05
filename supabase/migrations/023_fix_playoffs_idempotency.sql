-- Migration 023: Fix Playoffs Idempotency
-- Fix Plan Phase 2 - Playoff Integrity
-- Addresses: INV-4 (playoffs generated exactly once), INV-5 (playoff tiebreaker snapshot)
-- Fixes: Audit 2.4, 2.5
-- Date: January 5, 2026

-- ============================================
-- Replace generate_playoffs() with Idempotent Version
-- ============================================

CREATE OR REPLACE FUNCTION generate_playoffs(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    top_players UUID[];
    season_length INTEGER;
    playoff_week INTEGER;
    league_playoffs_started BOOLEAN;
BEGIN
    -- ============================================
    -- GUARD 1: Check if playoffs already started (fast path)
    -- ============================================
    SELECT playoffs_started INTO league_playoffs_started
    FROM leagues WHERE id = p_league_id;
    
    IF league_playoffs_started = TRUE THEN
        RETURN; -- Playoffs already generated, idempotent no-op
    END IF;
    
    -- ============================================
    -- GUARD 2: Check if playoff records already exist
    -- ============================================
    IF EXISTS (SELECT 1 FROM playoffs WHERE league_id = p_league_id) THEN
        RETURN; -- Playoff records already exist, idempotent no-op
    END IF;
    
    -- ============================================
    -- GUARD 3: Acquire advisory lock for this league
    -- Serializes all concurrent calls for playoff generation
    -- ============================================
    PERFORM pg_advisory_xact_lock(hashtext('playoffs-' || p_league_id::text));
    
    -- ============================================
    -- GUARD 4: Double-check after acquiring lock (double-check locking pattern)
    -- Handles race between initial check and lock acquisition
    -- ============================================
    SELECT playoffs_started INTO league_playoffs_started
    FROM leagues WHERE id = p_league_id;
    
    IF league_playoffs_started = TRUE THEN
        RETURN; -- Another concurrent call already generated playoffs
    END IF;
    
    IF EXISTS (SELECT 1 FROM playoffs WHERE league_id = p_league_id) THEN
        RETURN; -- Another concurrent call already created playoff records
    END IF;
    
    -- ============================================
    -- PROCESS: Generate playoffs
    -- ============================================
    
    -- Get season length
    SELECT season_length_weeks INTO season_length 
    FROM leagues WHERE id = p_league_id;
    
    playoff_week := season_length + 1;
    
    -- Get top 4 players by wins, then total points
    SELECT ARRAY_AGG(user_id ORDER BY wins DESC, total_points DESC)
    INTO top_players
    FROM (
        SELECT user_id, wins, total_points
        FROM league_members
        WHERE league_id = p_league_id
        ORDER BY wins DESC, total_points DESC
        LIMIT 4
    ) sub;
    
    IF array_length(top_players, 1) < 4 THEN
        RAISE EXCEPTION 'Not enough players for playoffs';
    END IF;
    
    -- Set playoff seeds
    UPDATE league_members 
    SET playoff_seed = 1 
    WHERE league_id = p_league_id AND user_id = top_players[1];
    
    UPDATE league_members 
    SET playoff_seed = 2 
    WHERE league_id = p_league_id AND user_id = top_players[2];
    
    UPDATE league_members 
    SET playoff_seed = 3 
    WHERE league_id = p_league_id AND user_id = top_players[3];
    
    UPDATE league_members 
    SET playoff_seed = 4 
    WHERE league_id = p_league_id AND user_id = top_players[4];
    
    -- ============================================
    -- SNAPSHOT: Freeze playoff_tiebreaker_points
    -- This prevents late health syncs from affecting playoff outcomes
    -- ============================================
    UPDATE league_members
    SET playoff_tiebreaker_points = total_points
    WHERE league_id = p_league_id 
    AND user_id = ANY(top_players);
    
    -- Create semifinal matchups: 1 vs 4, 2 vs 3
    INSERT INTO playoffs (league_id, round, match_number, player1_id, player2_id, week_number)
    VALUES 
        (p_league_id, 1, 1, top_players[1], top_players[4], playoff_week),
        (p_league_id, 1, 2, top_players[2], top_players[3], playoff_week)
    ON CONFLICT DO NOTHING; -- Backup safety net
    
    -- Mark playoffs as started
    UPDATE leagues 
    SET playoffs_started = TRUE 
    WHERE id = p_league_id;
    
    -- Advisory lock automatically releases at transaction end
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Add Comment for Documentation
-- ============================================
COMMENT ON FUNCTION generate_playoffs(UUID) IS 'Idempotent function to generate playoffs. Uses advisory locks and guard clauses to ensure playoffs are only generated once. Snapshots playoff_tiebreaker_points to freeze standings for playoff tiebreakers.';

