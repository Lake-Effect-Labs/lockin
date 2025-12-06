-- Fix playoff finalization to handle ties and prevent race conditions
-- Run this migration to update the finalize_playoff_match function

CREATE OR REPLACE FUNCTION finalize_playoff_match(p_playoff_id UUID)
RETURNS VOID AS $$
DECLARE
    playoff RECORD;
    winner UUID;
    loser UUID;
    other_semi RECORD;
    finals_week INTEGER;
BEGIN
    SELECT * INTO playoff FROM playoffs WHERE id = p_playoff_id;
    
    -- Prevent double-finalization
    IF playoff.is_finalized THEN
        RETURN;
    END IF;
    
    -- Handle tie case - in playoffs, ties are broken by total_points
    IF playoff.player1_score = playoff.player2_score THEN
        -- Tie in playoffs - use total_points as tiebreaker
        DECLARE
            p1_total_points DECIMAL;
            p2_total_points DECIMAL;
        BEGIN
            SELECT total_points INTO p1_total_points
            FROM league_members 
            WHERE league_id = playoff.league_id AND user_id = playoff.player1_id;
            
            SELECT total_points INTO p2_total_points
            FROM league_members 
            WHERE league_id = playoff.league_id AND user_id = playoff.player2_id;
            
            -- If still tied, player1 wins (arbitrary but consistent)
            IF COALESCE(p1_total_points, 0) >= COALESCE(p2_total_points, 0) THEN
                winner := playoff.player1_id;
                loser := playoff.player2_id;
            ELSE
                winner := playoff.player2_id;
                loser := playoff.player1_id;
            END IF;
        END;
    ELSIF playoff.player1_score > playoff.player2_score THEN
        winner := playoff.player1_id;
        loser := playoff.player2_id;
    ELSE
        winner := playoff.player2_id;
        loser := playoff.player1_id;
    END IF;
    
    -- Update playoff match (mark as finalized to prevent race conditions)
    UPDATE playoffs 
    SET winner_id = winner, 
        is_finalized = true
    WHERE id = p_playoff_id;
    
    -- Mark loser as eliminated
    UPDATE league_members 
    SET is_eliminated = true 
    WHERE league_id = playoff.league_id AND user_id = loser;
    
    -- If this was a semifinal, check if we need to create finals
    IF playoff.round = 1 THEN
        SELECT * INTO other_semi FROM playoffs 
        WHERE league_id = playoff.league_id 
          AND round = 1 
          AND match_number != playoff.match_number
          AND is_finalized = true;
        
        -- Only create finals if other semi is finalized and we have a winner
        IF other_semi.winner_id IS NOT NULL AND winner IS NOT NULL THEN
            finals_week := playoff.week_number + 1;
            
            -- Create finals match (prevent duplicates)
            INSERT INTO playoffs (league_id, round, match_number, player1_id, player2_id, week_number)
            VALUES (playoff.league_id, 2, 1, winner, other_semi.winner_id, finals_week)
            ON CONFLICT DO NOTHING; -- Prevent duplicate finals if called multiple times
        END IF;
    ELSIF playoff.round = 2 THEN
        -- Finals complete - crown champion
        IF winner IS NOT NULL THEN
            UPDATE leagues 
            SET champion_id = winner, 
                is_active = false 
            WHERE id = playoff.league_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

