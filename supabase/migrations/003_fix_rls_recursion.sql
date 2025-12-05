-- Fix infinite recursion in league_members RLS policy
-- The original policy was checking league_members from within league_members, causing recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view league members" ON league_members;

-- Create a helper function that uses SECURITY DEFINER to bypass RLS recursion
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

-- Create new policy using the helper function to avoid recursion
CREATE POLICY "Members can view league members" ON league_members
    FOR SELECT USING (
        -- User can always see their own membership
        user_id = auth.uid()
        OR
        -- User can see other members if they're in the same league (using helper function)
        is_league_member(league_id, auth.uid())
    );

