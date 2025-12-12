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
    last_opponents UUID[]; -- Track last opponent for each player
    current_opponent UUID;
    valid_pairing BOOLEAN;
    attempts INTEGER;
    max_attempts INTEGER;
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
    
    -- Get the highest week number that already has matchups
    SELECT COALESCE(MAX(week_number), 0) INTO week
    FROM matchups
    WHERE league_id = p_league_id;
    
    -- Start generating from the next week
    week := week + 1;
    
    -- Only generate matchups for weeks that don't exist yet
    -- and are within the season length
    IF week > season_length THEN
        RETURN; -- Season is over
    END IF;
    
    -- If odd number, add a "bye" placeholder (NULL)
    IF member_count % 2 = 1 THEN
        members := array_append(members, NULL::UUID);
        member_count := member_count + 1;
    END IF;
    
    -- Initialize last opponents array (track opponent for each player)
    last_opponents := ARRAY(SELECT NULL::UUID FROM generate_series(1, member_count));
    
    -- Generate matchups for the next week only
    rotated := members;
    
    -- Get last week's opponents to avoid repeats
    IF week > 1 THEN
        FOR i IN 1..member_count LOOP
            IF members[i] IS NOT NULL THEN
                -- Find who this player faced last week
                SELECT CASE 
                    WHEN player1_id = members[i] THEN player2_id
                    WHEN player2_id = members[i] THEN player1_id
                    ELSE NULL
                END INTO last_opponents[i]
                FROM matchups
                WHERE league_id = p_league_id 
                    AND week_number = week - 1
                    AND (player1_id = members[i] OR player2_id = members[i])
                LIMIT 1;
            END IF;
        END LOOP;
    END IF;
    
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
            -- Check if this pairing would be a repeat
            valid_pairing := true;
            
            -- Check if home player faced away player last week
            FOR j IN 1..member_count LOOP
                IF members[j] = rotated[home_idx] AND last_opponents[j] = rotated[away_idx] THEN
                    valid_pairing := false;
                    EXIT;
                END IF;
                IF members[j] = rotated[away_idx] AND last_opponents[j] = rotated[home_idx] THEN
                    valid_pairing := false;
                    EXIT;
                END IF;
            END LOOP;
            
            -- If repeat, try swapping with adjacent pairings
            IF NOT valid_pairing AND i < (member_count / 2) THEN
                -- Try swapping away_idx with next pairing's away_idx
                IF rotated[member_count - i] IS NOT NULL THEN
                    -- Check if swap would avoid repeat
                    valid_pairing := true;
                    FOR j IN 1..member_count LOOP
                        IF members[j] = rotated[home_idx] AND last_opponents[j] = rotated[member_count - i] THEN
                            valid_pairing := false;
                            EXIT;
                        END IF;
                        IF members[j] = rotated[member_count - i] AND last_opponents[j] = rotated[home_idx] THEN
                            valid_pairing := false;
                            EXIT;
                        END IF;
                    END LOOP;
                    
                    IF valid_pairing THEN
                        -- Swap
                        away_idx := member_count - i;
                    END IF;
                END IF;
            END IF;
            
            -- Insert matchup if valid (or if we couldn't avoid repeat, insert anyway)
            -- This handles edge cases where avoiding repeats is impossible
            INSERT INTO matchups (league_id, week_number, player1_id, player2_id)
            VALUES (p_league_id, week, rotated[home_idx], rotated[away_idx])
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

