-- Allow Bot Users for Testing (Speed Run)
-- This migration allows creating test users without auth.users entries
-- for the speed run test feature

-- ============================================
-- FIX USERS TABLE FOREIGN KEY
-- ============================================

-- Drop the foreign key constraint that requires users to exist in auth.users
-- This allows us to create bot users for testing without auth accounts
ALTER TABLE users 
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Add a comment explaining why we removed the constraint
COMMENT ON TABLE users IS 'User profiles. Note: id does not reference auth.users to allow test bot users for speed run feature.';

-- ============================================
-- UPDATE RLS POLICIES
-- ============================================

-- Users can still only update their own profile
-- But we allow inserting bot users (for testing) if they have a special email pattern
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile or bot users" ON users;

CREATE POLICY "Users can insert own profile or bot users" ON users
    FOR INSERT WITH CHECK (
        -- User inserting their own profile
        auth.uid() = id
        OR
        -- Allow bot users (email ends with @speedrun.test or @bot.test)
        -- This allows ANY authenticated user to create bot users for testing
        (email LIKE '%@speedrun.test' OR email LIKE '%@bot.test')
        OR
        -- Allow inserts from service role (for backend operations)
        auth.jwt()->>'role' = 'service_role'
    );

-- Also update the UPDATE policy to match
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile or bot users" ON users;

CREATE POLICY "Users can update own profile or bot users" ON users
    FOR UPDATE USING (
        -- User updating their own profile
        auth.uid() = id
        OR
        -- Allow bot users (email ends with @speedrun.test or @bot.test)
        (email LIKE '%@speedrun.test' OR email LIKE '%@bot.test')
    );

-- ============================================
-- FIX LEAGUE_MEMBERS RLS POLICIES
-- ============================================

-- Allow bot users to be added to leagues
DROP POLICY IF EXISTS "Users can join leagues" ON league_members;
DROP POLICY IF EXISTS "Users can join leagues or add bot users" ON league_members;

CREATE POLICY "Users can join leagues or add bot users" ON league_members
    FOR INSERT WITH CHECK (
        -- User joining a league themselves
        auth.uid() = user_id
        OR
        -- Allow adding bot users (check if user exists in users table with bot email)
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = league_members.user_id
            AND (users.email LIKE '%@speedrun.test' OR users.email LIKE '%@bot.test')
        )
    );

-- ============================================
-- NOTES
-- ============================================

-- This migration is necessary for the Speed Run test feature which creates
-- bot users to simulate a full league season. Bot users have UUIDs but no
-- corresponding auth.users entries.
--
-- In production, real users will still have auth.users entries created
-- automatically by Supabase Auth, and the auto-create profile trigger
-- (migration 002) will create their user profile.
--
-- Bot users are identified by:
-- - UUID format: 00000000-0000-4000-8000-XXXXXXXXXXXX
-- - Email: bot*@speedrun.test or bot*@bot.test

