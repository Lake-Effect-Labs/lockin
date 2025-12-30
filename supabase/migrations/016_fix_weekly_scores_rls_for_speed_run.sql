-- Fix Weekly Scores RLS to Allow League Admins to Insert Scores for Members
-- This fixes the Speed Run test which needs to insert scores for bot users

-- ============================================
-- FIX WEEKLY SCORES INSERT POLICY
-- ============================================

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can insert own scores" ON weekly_scores;

-- Create new policy that allows:
-- 1. Users to insert their own scores
-- 2. League admins to insert scores for any member of their league (for testing/speed run)
CREATE POLICY "Users and admins can insert scores" ON weekly_scores
    FOR INSERT WITH CHECK (
        -- User inserting their own score
        user_id = auth.uid()
        OR
        -- League admin inserting score for a member
        EXISTS (
            SELECT 1 FROM league_members AS lm
            WHERE lm.league_id = weekly_scores.league_id
            AND lm.user_id = auth.uid()
            AND lm.is_admin = true
            AND EXISTS (
                SELECT 1 FROM league_members AS target_member
                WHERE target_member.league_id = weekly_scores.league_id
                AND target_member.user_id = weekly_scores.user_id
            )
        )
    );

-- Also update the UPDATE policy to match
DROP POLICY IF EXISTS "Users can update own scores" ON weekly_scores;

CREATE POLICY "Users and admins can update scores" ON weekly_scores
    FOR UPDATE USING (
        -- User updating their own score
        user_id = auth.uid()
        OR
        -- League admin updating score for a member
        EXISTS (
            SELECT 1 FROM league_members AS lm
            WHERE lm.league_id = weekly_scores.league_id
            AND lm.user_id = auth.uid()
            AND lm.is_admin = true
        )
    );


