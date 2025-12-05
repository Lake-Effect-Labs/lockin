-- Add DELETE policy for leagues
-- Only the creator can delete their league

CREATE POLICY "Creator can delete league" ON leagues
    FOR DELETE USING (
        created_by = auth.uid()
    );

