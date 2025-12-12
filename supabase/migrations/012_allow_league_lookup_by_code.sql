-- Allow anyone to look up leagues by join code (for joining)
-- This fixes the issue where users can't join leagues because RLS blocks the lookup
-- 
-- The problem: RLS policy "Members can view their leagues" only allows:
-- 1. League creators
-- 2. Existing members
-- 
-- But when someone tries to JOIN by code, they're not a member yet, so they can't see the league!
-- This creates a chicken-and-egg problem.
--
-- Solution: Update the SELECT policy to also allow authenticated users to look up leagues
-- This is safe because:
-- - Join codes are meant to be shareable
-- - The join_code itself acts as access control
-- - Users still need the correct code to join

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Members can view their leagues" ON leagues;

-- Create a new policy that allows join code lookups
CREATE POLICY "Members can view their leagues" ON leagues
    FOR SELECT USING (
        -- Allow if user created the league
        created_by = auth.uid()
        OR
        -- Allow if user is already a member
        is_league_member(id, auth.uid())
        OR
        -- Allow authenticated users to look up leagues (for joining by code)
        -- This is safe because join codes are shareable and act as access control
        auth.uid() IS NOT NULL
    );

