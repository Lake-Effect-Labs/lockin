-- Fix leagues INSERT policy to ensure created_by matches auth.uid()
-- The current policy only checks if user is authenticated, but doesn't verify created_by

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create leagues" ON leagues;

-- Create a new policy that ensures created_by matches the authenticated user
CREATE POLICY "Authenticated users can create leagues" ON leagues
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL 
        AND created_by = auth.uid()
    );

