-- Comprehensive RLS Policy Fixes
-- Fixes all potential RLS issues to prevent errors on database interactions

-- ============================================
-- 1. FIX LEAGUES POLICIES
-- ============================================

-- Fix SELECT: Users should be able to see leagues they created OR leagues they're members of
DROP POLICY IF EXISTS "Members can view their leagues" ON leagues;
CREATE POLICY "Members can view their leagues" ON leagues
    FOR SELECT USING (
        -- User created the league
        created_by = auth.uid()
        OR
        -- User is a member of the league (using helper function to avoid recursion)
        is_league_member(id, auth.uid())
    );

-- Fix INSERT: Already fixed in migration 004, but ensure it's correct
DROP POLICY IF EXISTS "Authenticated users can create leagues" ON leagues;
CREATE POLICY "Authenticated users can create leagues" ON leagues
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND created_by = auth.uid()
    );

-- ============================================
-- 2. FIX MATCHUPS POLICIES
-- ============================================

-- Fix the "FOR ALL" policy - needs separate policies for INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "Creator can manage matchups" ON matchups;

-- SELECT: Members can view matchups
-- (Already exists, but ensure it's correct)

-- INSERT: Creator can create matchups
CREATE POLICY "Creator can insert matchups" ON matchups
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE leagues.id = matchups.league_id 
            AND leagues.created_by = auth.uid()
        )
    );

-- UPDATE: Creator can update matchups
CREATE POLICY "Creator can update matchups" ON matchups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE leagues.id = matchups.league_id 
            AND leagues.created_by = auth.uid()
        )
    );

-- DELETE: Creator can delete matchups
CREATE POLICY "Creator can delete matchups" ON matchups
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE leagues.id = matchups.league_id 
            AND leagues.created_by = auth.uid()
        )
    );

-- ============================================
-- 3. FIX WEEKLY SCORES POLICIES
-- ============================================

-- Fix the "FOR ALL" policy - needs separate policies
DROP POLICY IF EXISTS "Users can manage own scores" ON weekly_scores;

-- SELECT: Members can view weekly scores (already exists)

-- INSERT: Users can insert their own scores
CREATE POLICY "Users can insert own scores" ON weekly_scores
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own scores
CREATE POLICY "Users can update own scores" ON weekly_scores
    FOR UPDATE USING (user_id = auth.uid());

-- DELETE: Users can delete their own scores (if needed)
CREATE POLICY "Users can delete own scores" ON weekly_scores
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 4. FIX PLAYOFFS POLICIES
-- ============================================

-- Fix the "FOR ALL" policy - needs separate policies
DROP POLICY IF EXISTS "Creator can manage playoffs" ON playoffs;

-- SELECT: Members can view playoffs (already exists)

-- INSERT: Creator can create playoffs
CREATE POLICY "Creator can insert playoffs" ON playoffs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE leagues.id = playoffs.league_id 
            AND leagues.created_by = auth.uid()
        )
    );

-- UPDATE: Creator can update playoffs
CREATE POLICY "Creator can update playoffs" ON playoffs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE leagues.id = playoffs.league_id 
            AND leagues.created_by = auth.uid()
        )
    );

-- DELETE: Creator can delete playoffs
CREATE POLICY "Creator can delete playoffs" ON playoffs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM leagues 
            WHERE leagues.id = playoffs.league_id 
            AND leagues.created_by = auth.uid()
        )
    );

-- ============================================
-- 5. ENSURE HELPER FUNCTION EXISTS
-- ============================================

-- Make sure the helper function exists (from migration 003)
CREATE OR REPLACE FUNCTION is_league_member(p_league_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM league_members
        WHERE league_id = p_league_id
        AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

