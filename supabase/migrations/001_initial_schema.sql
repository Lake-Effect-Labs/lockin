-- Lock-In Fitness Competition App
-- Complete Supabase Schema with RLS Policies
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: CREATE ALL TABLES FIRST
-- ============================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    avatar_url TEXT,
    push_token TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- LEAGUES TABLE
CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (char_length(name) <= 30),
    join_code TEXT UNIQUE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    season_length_weeks INTEGER NOT NULL CHECK (season_length_weeks IN (6, 8, 10, 12)),
    current_week INTEGER DEFAULT 1,
    start_date DATE,
    is_active BOOLEAN DEFAULT true,
    playoffs_started BOOLEAN DEFAULT false,
    champion_id UUID REFERENCES users(id),
    max_players INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- LEAGUE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS league_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ties INTEGER DEFAULT 0,
    total_points DECIMAL(10, 2) DEFAULT 0,
    playoff_seed INTEGER,
    is_eliminated BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(league_id, user_id)
);

-- MATCHUPS TABLE
CREATE TABLE IF NOT EXISTS matchups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
    week_number INTEGER NOT NULL,
    player1_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    player2_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    player1_score DECIMAL(10, 2) DEFAULT 0,
    player2_score DECIMAL(10, 2) DEFAULT 0,
    winner_id UUID REFERENCES users(id),
    is_tie BOOLEAN DEFAULT false,
    is_finalized BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(league_id, week_number, player1_id),
    UNIQUE(league_id, week_number, player2_id)
);

-- WEEKLY SCORES TABLE
CREATE TABLE IF NOT EXISTS weekly_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    week_number INTEGER NOT NULL,
    steps INTEGER DEFAULT 0,
    sleep_hours DECIMAL(5, 2) DEFAULT 0,
    calories INTEGER DEFAULT 0,
    workouts INTEGER DEFAULT 0,
    distance DECIMAL(10, 2) DEFAULT 0,
    total_points DECIMAL(10, 2) DEFAULT 0,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(league_id, user_id, week_number)
);

-- PLAYOFFS TABLE
CREATE TABLE IF NOT EXISTS playoffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE NOT NULL,
    round INTEGER NOT NULL CHECK (round IN (1, 2)), -- 1 = semifinals, 2 = finals
    match_number INTEGER NOT NULL CHECK (match_number IN (1, 2)),
    player1_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    player2_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    player1_score DECIMAL(10, 2) DEFAULT 0,
    player2_score DECIMAL(10, 2) DEFAULT 0,
    winner_id UUID REFERENCES users(id),
    is_finalized BOOLEAN DEFAULT false,
    week_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(league_id, round, match_number)
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL, -- 'week_start', 'week_end', 'matchup_win', 'matchup_loss', 'playoffs_start', 'champion'
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: CREATE RLS POLICIES
-- (Now that all tables exist, we can reference them)
-- ============================================

-- USERS POLICIES
CREATE POLICY "Users can view all profiles" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- LEAGUES POLICIES
CREATE POLICY "Members can view their leagues" ON leagues
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM league_members 
            WHERE league_members.league_id = leagues.id 
            AND league_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create leagues" ON leagues
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creator can update league" ON leagues
    FOR UPDATE USING (created_by = auth.uid());

-- LEAGUE MEMBERS POLICIES
CREATE POLICY "Members can view league members" ON league_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM league_members lm 
            WHERE lm.league_id = league_members.league_id 
            AND lm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join leagues" ON league_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON league_members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can leave leagues" ON league_members
    FOR DELETE USING (user_id = auth.uid());

-- MATCHUPS POLICIES
CREATE POLICY "Members can view matchups" ON matchups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM league_members 
            WHERE league_members.league_id = matchups.league_id 
            AND league_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Creator can manage matchups" ON matchups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE leagues.id = matchups.league_id 
            AND leagues.created_by = auth.uid()
        )
    );

-- WEEKLY SCORES POLICIES
CREATE POLICY "Members can view weekly scores" ON weekly_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM league_members 
            WHERE league_members.league_id = weekly_scores.league_id 
            AND league_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own scores" ON weekly_scores
    FOR ALL USING (user_id = auth.uid());

-- PLAYOFFS POLICIES
CREATE POLICY "Members can view playoffs" ON playoffs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM league_members 
            WHERE league_members.league_id = playoffs.league_id 
            AND league_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Creator can manage playoffs" ON playoffs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE leagues.id = playoffs.league_id 
            AND leagues.created_by = auth.uid()
        )
    );

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- STEP 4: FUNCTIONS
-- ============================================

-- Function to generate unique join code
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate points from metrics
CREATE OR REPLACE FUNCTION calculate_points(
    p_steps INTEGER,
    p_sleep_hours DECIMAL,
    p_calories INTEGER,
    p_workouts INTEGER,
    p_distance DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    POINTS_PER_1000_STEPS CONSTANT DECIMAL := 1;
    POINTS_PER_SLEEP_HOUR CONSTANT DECIMAL := 2;
    POINTS_PER_100_CALORIES CONSTANT DECIMAL := 5;
    POINTS_PER_WORKOUT CONSTANT DECIMAL := 20;
    POINTS_PER_MILE CONSTANT DECIMAL := 3;
    total DECIMAL;
BEGIN
    total := (p_steps / 1000.0) * POINTS_PER_1000_STEPS
           + p_sleep_hours * POINTS_PER_SLEEP_HOUR
           + (p_calories / 100.0) * POINTS_PER_100_CALORIES
           + p_workouts * POINTS_PER_WORKOUT
           + p_distance * POINTS_PER_MILE;
    RETURN ROUND(total, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to generate matchup schedule for a league
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
    
    -- If odd number, add a "bye" placeholder (NULL)
    IF member_count % 2 = 1 THEN
        members := array_append(members, NULL::UUID);
        member_count := member_count + 1;
    END IF;
    
    -- Round-robin scheduling
    FOR week IN 1..season_length LOOP
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
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to finalize week and determine winners
CREATE OR REPLACE FUNCTION finalize_week(p_league_id UUID, p_week INTEGER)
RETURNS VOID AS $$
DECLARE
    matchup RECORD;
    p1_score DECIMAL;
    p2_score DECIMAL;
BEGIN
    FOR matchup IN 
        SELECT * FROM matchups 
        WHERE league_id = p_league_id AND week_number = p_week AND NOT is_finalized
    LOOP
        -- Get current scores from weekly_scores
        SELECT COALESCE(total_points, 0) INTO p1_score
        FROM weekly_scores 
        WHERE league_id = p_league_id AND user_id = matchup.player1_id AND week_number = p_week;
        
        SELECT COALESCE(total_points, 0) INTO p2_score
        FROM weekly_scores 
        WHERE league_id = p_league_id AND user_id = matchup.player2_id AND week_number = p_week;
        
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
            UPDATE matchups SET winner_id = matchup.player1_id, is_finalized = true WHERE id = matchup.id;
            UPDATE league_members SET wins = wins + 1 WHERE league_id = p_league_id AND user_id = matchup.player1_id;
            UPDATE league_members SET losses = losses + 1 WHERE league_id = p_league_id AND user_id = matchup.player2_id;
        ELSIF p2_score > p1_score THEN
            UPDATE matchups SET winner_id = matchup.player2_id, is_finalized = true WHERE id = matchup.id;
            UPDATE league_members SET wins = wins + 1 WHERE league_id = p_league_id AND user_id = matchup.player2_id;
            UPDATE league_members SET losses = losses + 1 WHERE league_id = p_league_id AND user_id = matchup.player1_id;
        ELSE
            -- Tie - both players get a tie
            UPDATE matchups SET is_tie = true, is_finalized = true WHERE id = matchup.id;
            UPDATE league_members SET ties = ties + 1 WHERE league_id = p_league_id AND user_id = matchup.player1_id;
            UPDATE league_members SET ties = ties + 1 WHERE league_id = p_league_id AND user_id = matchup.player2_id;
        END IF;
        
        -- Update total points for both players
        UPDATE league_members 
        SET total_points = total_points + p1_score
        WHERE league_id = p_league_id AND user_id = matchup.player1_id;
        
        UPDATE league_members 
        SET total_points = total_points + p2_score
        WHERE league_id = p_league_id AND user_id = matchup.player2_id;
    END LOOP;
    
    -- Advance week
    UPDATE leagues SET current_week = current_week + 1 WHERE id = p_league_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if league is full
CREATE OR REPLACE FUNCTION check_league_capacity()
RETURNS TRIGGER AS $$
DECLARE
    current_count INTEGER;
    max_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_count
    FROM league_members
    WHERE league_id = NEW.league_id;
    
    SELECT COALESCE(max_players, 20) INTO max_count
    FROM leagues
    WHERE id = NEW.league_id;
    
    IF current_count >= max_count THEN
        RAISE EXCEPTION 'League is full (maximum % players)', max_count;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate playoffs
CREATE OR REPLACE FUNCTION generate_playoffs(p_league_id UUID)
RETURNS VOID AS $$
DECLARE
    top_players UUID[];
    season_length INTEGER;
    playoff_week INTEGER;
BEGIN
    -- Get season length
    SELECT season_length_weeks INTO season_length FROM leagues WHERE id = p_league_id;
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
    UPDATE league_members SET playoff_seed = 1 WHERE league_id = p_league_id AND user_id = top_players[1];
    UPDATE league_members SET playoff_seed = 2 WHERE league_id = p_league_id AND user_id = top_players[2];
    UPDATE league_members SET playoff_seed = 3 WHERE league_id = p_league_id AND user_id = top_players[3];
    UPDATE league_members SET playoff_seed = 4 WHERE league_id = p_league_id AND user_id = top_players[4];
    
    -- Create semifinal matchups: 1 vs 4, 2 vs 3
    INSERT INTO playoffs (league_id, round, match_number, player1_id, player2_id, week_number)
    VALUES 
        (p_league_id, 1, 1, top_players[1], top_players[4], playoff_week),
        (p_league_id, 1, 2, top_players[2], top_players[3], playoff_week);
    
    -- Mark playoffs as started
    UPDATE leagues SET playoffs_started = true WHERE id = p_league_id;
END;
$$ LANGUAGE plpgsql;

-- Function to finalize playoff match
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
    
    -- Determine winner
    IF playoff.player1_score > playoff.player2_score THEN
        winner := playoff.player1_id;
        loser := playoff.player2_id;
    ELSE
        winner := playoff.player2_id;
        loser := playoff.player1_id;
    END IF;
    
    -- Update playoff match
    UPDATE playoffs SET winner_id = winner, is_finalized = true WHERE id = p_playoff_id;
    
    -- Mark loser as eliminated
    UPDATE league_members SET is_eliminated = true WHERE league_id = playoff.league_id AND user_id = loser;
    
    -- If this was a semifinal, check if we need to create finals
    IF playoff.round = 1 THEN
        SELECT * INTO other_semi FROM playoffs 
        WHERE league_id = playoff.league_id AND round = 1 AND match_number != playoff.match_number;
        
        IF other_semi.is_finalized THEN
            finals_week := playoff.week_number + 1;
            
            -- Create finals match
            INSERT INTO playoffs (league_id, round, match_number, player1_id, player2_id, week_number)
            VALUES (playoff.league_id, 2, 1, winner, other_semi.winner_id, finals_week);
        END IF;
    ELSIF playoff.round = 2 THEN
        -- Finals complete - crown champion
        UPDATE leagues SET champion_id = winner, is_active = false WHERE id = playoff.league_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 5: TRIGGERS
-- ============================================

-- Auto-update updated_at on users
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto-calculate total_points on weekly_scores insert/update
CREATE OR REPLACE FUNCTION auto_calculate_points()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_points := calculate_points(
        NEW.steps,
        NEW.sleep_hours,
        NEW.calories,
        NEW.workouts,
        NEW.distance
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER weekly_scores_calculate_points
    BEFORE INSERT OR UPDATE ON weekly_scores
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_points();

-- Check league capacity before insert
CREATE TRIGGER check_league_capacity_trigger
    BEFORE INSERT ON league_members
    FOR EACH ROW
    EXECUTE FUNCTION check_league_capacity();

-- ============================================
-- STEP 6: INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_league_members_league ON league_members(league_id);
CREATE INDEX IF NOT EXISTS idx_league_members_user ON league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_matchups_league_week ON matchups(league_id, week_number);
CREATE INDEX IF NOT EXISTS idx_weekly_scores_league_week ON weekly_scores(league_id, week_number);
CREATE INDEX IF NOT EXISTS idx_playoffs_league ON playoffs(league_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);

-- ============================================
-- STEP 7: ENABLE REALTIME
-- ============================================
-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE league_members;
ALTER PUBLICATION supabase_realtime ADD TABLE matchups;
ALTER PUBLICATION supabase_realtime ADD TABLE weekly_scores;
