-- Migration 022: Fix RLS Security Holes
-- Fix Plan Phase 1 - Trust Killers
-- Addresses: INV-6 (only SQL functions can modify standings data)
-- Fixes: Audit 3.4, 5.4
-- Date: January 5, 2026

-- ============================================
-- PART 1: Fix Users Table - Remove Bot Creation
-- ============================================

-- Drop the dangerous policy that allows bot user creation
DROP POLICY IF EXISTS "Users can insert own profile or bot users" ON users;

-- Create strict policy: users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- PART 2: Fix league_members Table - Lockdown Competition Data
-- ============================================

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "League members can be updated" ON league_members;
DROP POLICY IF EXISTS "Users can update own membership" ON league_members;

-- Create restrictive policy that prevents users from modifying competition data
-- Users can only update their own membership, but CANNOT modify:
-- - wins, losses, ties (set by finalize_week)
-- - total_points (set by finalize_week)
-- - playoff_seed (set by generate_playoffs)
-- - playoff_tiebreaker_points (set by generate_playoffs)
-- - is_eliminated (set by finalize_playoff_match)
CREATE POLICY "Users cannot modify competition data" ON league_members
    FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (
        -- Ensure competition fields haven't changed
        wins = (SELECT wins FROM league_members WHERE id = league_members.id) AND
        losses = (SELECT losses FROM league_members WHERE id = league_members.id) AND
        ties = (SELECT ties FROM league_members WHERE id = league_members.id) AND
        total_points = (SELECT total_points FROM league_members WHERE id = league_members.id) AND
        COALESCE(playoff_seed, 0) = COALESCE((SELECT playoff_seed FROM league_members WHERE id = league_members.id), 0) AND
        COALESCE(playoff_tiebreaker_points, 0) = COALESCE((SELECT playoff_tiebreaker_points FROM league_members WHERE id = league_members.id), 0) AND
        is_eliminated = (SELECT is_eliminated FROM league_members WHERE id = league_members.id)
    );

-- ============================================
-- PART 3: Fix league_members INSERT - Remove Bot Addition
-- ============================================

-- Drop the policy that allows adding bot users
DROP POLICY IF EXISTS "Users can join leagues or add bot users" ON league_members;

-- Create strict policy: users can only add themselves
CREATE POLICY "Users can join leagues" ON league_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 4: Lockdown Matchups - No User Modification
-- ============================================

-- Drop the creator management policy (too permissive)
DROP POLICY IF EXISTS "Creator can manage matchups" ON matchups;

-- Matchups can only be viewed, never modified by users
-- All modifications happen through SQL functions with SECURITY DEFINER
-- (The existing "Members can view matchups" SELECT policy is fine)

-- ============================================
-- PART 5: Lockdown Playoffs - No User Modification
-- ============================================

-- Drop the creator management policy (too permissive)
DROP POLICY IF EXISTS "Creator can manage playoffs" ON playoffs;

-- Playoffs can only be viewed, never modified by users
-- All modifications happen through SQL functions with SECURITY DEFINER
-- (The existing "Members can view playoffs" SELECT policy is fine)

-- ============================================
-- PART 6: Add Comments for Documentation
-- ============================================

COMMENT ON POLICY "Users can insert own profile" ON users IS 'Users can only create their own profile. Bot creation requires service role.';
COMMENT ON POLICY "Users cannot modify competition data" ON league_members IS 'Users cannot modify wins, losses, ties, total_points, playoff_seed, playoff_tiebreaker_points, or is_eliminated. These fields are managed by SQL functions only.';
COMMENT ON POLICY "Users can join leagues" ON league_members IS 'Users can only add themselves to leagues. Bot addition requires service role.';

