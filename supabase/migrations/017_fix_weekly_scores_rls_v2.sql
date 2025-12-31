-- Fix Weekly Scores RLS v2 - More Robust Version
-- Completely rebuilds the weekly_scores RLS policies to fix speed run issues

-- ============================================
-- DROP ALL EXISTING WEEKLY_SCORES POLICIES
-- ============================================

-- Drop any possible existing policies (old and new names)
DROP POLICY IF EXISTS "Users can insert own scores" ON weekly_scores;
DROP POLICY IF EXISTS "Users can update own scores" ON weekly_scores;
DROP POLICY IF EXISTS "Users can delete own scores" ON weekly_scores;
DROP POLICY IF EXISTS "Users and admins can insert scores" ON weekly_scores;
DROP POLICY IF EXISTS "Users and admins can update scores" ON weekly_scores;
DROP POLICY IF EXISTS "Users can manage own scores" ON weekly_scores;
DROP POLICY IF EXISTS "Members can view weekly scores" ON weekly_scores;

-- ============================================
-- CREATE FRESH POLICIES
-- ============================================

-- SELECT: Any league member can view scores in their league
CREATE POLICY "Members can view weekly scores" ON weekly_scores
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_members.league_id = weekly_scores.league_id
            AND league_members.user_id = auth.uid()
        )
    );

-- INSERT: Users can insert own scores OR league admins can insert for any user in their league
CREATE POLICY "Users and admins can insert scores" ON weekly_scores
    FOR INSERT WITH CHECK (
        -- User inserting their own score
        user_id = auth.uid()
        OR
        -- League admin inserting score for anyone in their league
        -- (Trust admins - they manage the league)
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_members.league_id = weekly_scores.league_id
            AND league_members.user_id = auth.uid()
            AND league_members.is_admin = true
        )
    );

-- UPDATE: Users can update own scores OR league admins can update any score in their league
CREATE POLICY "Users and admins can update scores" ON weekly_scores
    FOR UPDATE USING (
        -- User updating their own score
        user_id = auth.uid()
        OR
        -- League admin can update any score in their league
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_members.league_id = weekly_scores.league_id
            AND league_members.user_id = auth.uid()
            AND league_members.is_admin = true
        )
    )
    WITH CHECK (
        -- Same check for the new row values
        user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_members.league_id = weekly_scores.league_id
            AND league_members.user_id = auth.uid()
            AND league_members.is_admin = true
        )
    );

-- DELETE: Users can delete own scores OR league admins can delete any score in their league
CREATE POLICY "Users and admins can delete scores" ON weekly_scores
    FOR DELETE USING (
        -- User deleting their own score
        user_id = auth.uid()
        OR
        -- League admin can delete any score in their league
        EXISTS (
            SELECT 1 FROM league_members
            WHERE league_members.league_id = weekly_scores.league_id
            AND league_members.user_id = auth.uid()
            AND league_members.is_admin = true
        )
    );

-- ============================================
-- VERIFY RLS IS ENABLED
-- ============================================
ALTER TABLE weekly_scores ENABLE ROW LEVEL SECURITY;
