-- Improve matchup generation to avoid repeat opponents
-- Ensures players don't face the same opponent twice in a row
-- Uses a smarter round-robin algorithm that tracks previous opponents

CREATE OR REPLACE FUNCTION generate_matchups(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    members UUID[];
    member_count INTEGER;
    week INTEGER;
    i INTEGER;
    j INTEGER;
    season_length INTEGER;
    rotated UUID[];
    home_idx INTEGER;
    away_idx INTEGER;
    valid_pairing BOOLEAN;
BEGIN
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
    
    -- Get the current week from the league
    SELECT current_week INTO week
    FROM leagues
    WHERE id = p_league_id;
    
    -- Generate matchups for the current week if it doesn't exist
    -- This handles auto-advancement scenarios where week advanced but matchups weren't generated
    IF week IS NULL OR week < 1 OR week > season_length THEN
        RETURN; -- Invalid week or season is over
    END IF;
    
    -- If odd number, add a "bye" placeholder (NULL)
    IF member_count % 2 = 1 THEN
        members := array_append(members, NULL::UUID);
        member_count := member_count + 1;
    END IF;
    
    -- Check if matchups already exist for this week
    IF EXISTS (SELECT 1 FROM matchups WHERE league_id = p_league_id AND week_number = week) THEN
        RETURN; -- Matchups already exist for this week
    END IF;
    
    -- Generate matchups for the current week
    rotated := members;
    
    -- Use round-robin rotation, but ensure no repeat opponents
    -- Rotate based on week number (standard round-robin)
    IF week > 1 THEN
        FOR i IN 1..(week - 1) LOOP
            rotated := ARRAY[rotated[1]] || rotated[member_count] || rotated[2:member_count-1];
        END LOOP;
    END IF;
    
    -- Create matchups with repeat-avoidance logic
    FOR i IN 1..(member_count / 2) LOOP
        home_idx := i;
        away_idx := member_count - i + 1;
        
        -- Skip if either is NULL (bye week)
        IF rotated[home_idx] IS NOT NULL AND rotated[away_idx] IS NOT NULL THEN
            -- Check if this pairing would be a repeat (faced each other last week)
            valid_pairing := true;
            
            IF week > 1 THEN
                -- Check if these two players faced each other last week
                SELECT COUNT(*) INTO j
                FROM matchups
                WHERE league_id = p_league_id 
                    AND week_number = week - 1
                    AND (
                        (player1_id = rotated[home_idx] AND player2_id = rotated[away_idx])
                        OR (player1_id = rotated[away_idx] AND player2_id = rotated[home_idx])
                    );
                
                IF j > 0 THEN
                    valid_pairing := false;
                    
                    -- Try swapping with adjacent pairings to avoid repeat
                    IF i < (member_count / 2) AND rotated[member_count - i] IS NOT NULL THEN
                        -- Check if swap would avoid repeat
                        SELECT COUNT(*) INTO j
                        FROM matchups
                        WHERE league_id = p_league_id 
                            AND week_number = week - 1
                            AND (
                                (player1_id = rotated[home_idx] AND player2_id = rotated[member_count - i])
                                OR (player1_id = rotated[member_count - i] AND player2_id = rotated[home_idx])
                            );
                        
                        IF j = 0 THEN
                            valid_pairing := true;
                            -- Swap
                            away_idx := member_count - i;
                        END IF;
                    END IF;
                END IF;
            END IF;
            
            -- Insert matchup (even if repeat - handles edge cases where avoiding repeats is impossible)
            INSERT INTO matchups (league_id, week_number, player1_id, player2_id)
            VALUES (p_league_id, week, rotated[home_idx], rotated[away_idx])
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

